import { Processor, Process, OnQueueFailed, OnQueueCompleted } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { ScheduleStatus, NotificationType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { BalanceService } from '../../schedule/balance.service';
import { SmsService } from '../../sms/sms.service';
import { EncryptionService } from '../../common/encryption/encryption.service';
import {
  SCHEDULE_QUEUE,
  BALANCE_CHECK_DAY_JOB,
  BALANCE_CHECK_HOUR_JOB,
} from '../queue.constants';

export interface BalanceCheckJobData {
  scheduleId: string;
  userId: string;
  checkType: '1day' | '1hour';
}

@Processor(SCHEDULE_QUEUE)
export class BalanceCheckProcessor {
  private readonly logger = new Logger(BalanceCheckProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly balanceService: BalanceService,
    private readonly smsService: SmsService,
    private readonly enc: EncryptionService,
  ) {}

  @Process(BALANCE_CHECK_DAY_JOB)
  async handleDayBefore(job: Job<BalanceCheckJobData>) {
    await this.runCheck(job.data, '24 hours');
  }

  @Process(BALANCE_CHECK_HOUR_JOB)
  async handleHourBefore(job: Job<BalanceCheckJobData>) {
    await this.runCheck(job.data, '1 hour');
  }

  // ─── Core check logic ─────────────────────────────────────────────────────

  private async runCheck(data: BalanceCheckJobData, window: string) {
    const { scheduleId, userId } = data;
    this.logger.log(`[BalanceCheck] ${window} check for schedule ${scheduleId}`);

    // 1. Fetch schedule — skip if cancelled / paused
    const schedule = await this.prisma.schedule.findUnique({
      where: { id: scheduleId },
      include: { user: { select: { phone: true, name: true } } },
    });

    if (!schedule) {
      this.logger.warn(`[BalanceCheck] Schedule ${scheduleId} not found — skipping`);
      return;
    }

    if (schedule.status !== ScheduleStatus.ACTIVE) {
      this.logger.log(`[BalanceCheck] Schedule ${scheduleId} is ${schedule.status} — skipping`);
      return;
    }

    // 2. Check balance
    const result = await this.balanceService.getBalance(userId, schedule.provider);
    const sufficient = result.balance >= schedule.amount;

    this.logger.log(
      `[BalanceCheck] ${schedule.provider} balance: ${result.balance} NPR | ` +
      `Required: ${schedule.amount} NPR | Sufficient: ${sufficient}`,
    );

    // 3. Build messages
    const shortRef = `"${schedule.name}"`;

    if (sufficient) {
      // All good — just a heads-up SMS so user knows auto-payment is coming
      const msg =
        window === '24 hours'
          ? `PaySmart: Your scheduled payment ${shortRef} of Rs.${schedule.amount} via ${schedule.provider} ` +
            `will auto-execute TOMORROW. Balance: Rs.${result.balance} ✓`
          : `PaySmart: Scheduled payment ${shortRef} of Rs.${schedule.amount} via ${schedule.provider} ` +
            `will execute in ~1 HOUR. Balance: Rs.${result.balance} ✓`;

      if (schedule.user.phone) {
        this.smsService.send(this.enc.decrypt(schedule.user.phone), msg);
      }

      await this.saveNotification(userId, NotificationType.SCHEDULE_REMINDER, {
        title: `Upcoming payment — ${window} notice`,
        body: msg,
        scheduleId,
        balance: result.balance,
        required: schedule.amount,
        amount: schedule.amount,
        recipientId: schedule.recipientId,
        provider: schedule.provider,
        scheduleName: schedule.name,
        sufficient: true,
      });
    } else {
      // Insufficient balance — alert user urgently
      const shortfall = schedule.amount - result.balance;
      const alertMsg =
        `PaySmart ALERT: Insufficient balance for scheduled payment ${shortRef}. ` +
        `Need Rs.${schedule.amount} | Have Rs.${result.balance} | Shortfall Rs.${shortfall}. ` +
        `Please top up your ${schedule.provider} wallet within ${window}.`;

      if (schedule.user.phone) {
        this.smsService.send(this.enc.decrypt(schedule.user.phone), alertMsg);
      }

      await this.saveNotification(userId, NotificationType.PAYMENT_FAILED, {
        title: `Low balance — payment at risk`,
        body: alertMsg,
        scheduleId,
        balance: result.balance,
        required: schedule.amount,
        shortfall,
        sufficient: false,
      });

      // Bump retryCount so we know this schedule had pre-flight warnings
      await this.prisma.schedule.update({
        where: { id: scheduleId },
        data: { retryCount: { increment: 0 } }, // no-op — just a hook for future logic
      });

      this.logger.warn(
        `[BalanceCheck] LOW BALANCE — user ${userId}, schedule ${scheduleId}, ` +
        `shortfall: Rs.${shortfall}`,
      );
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private async saveNotification(
    userId: string,
    type: NotificationType,
    metadata: Record<string, any>,
  ) {
    await this.prisma.notification.create({
      data: { userId, type, title: metadata.title, body: metadata.body, metadata },
    });
  }

  @OnQueueCompleted()
  onCompleted(job: Job) {
    this.logger.log(`[BalanceCheck] Job ${job.id} (${job.name}) completed`);
  }

  @OnQueueFailed()
  onFailed(job: Job, error: Error) {
    this.logger.error(`[BalanceCheck] Job ${job.id} (${job.name}) failed: ${error.message}`);
  }
}
