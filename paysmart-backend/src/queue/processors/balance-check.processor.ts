import { Processor, Process, OnQueueFailed, OnQueueCompleted } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { ScheduleStatus, NotificationType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { BalanceService } from '../../schedule/balance.service';
import { SmsService } from '../../sms/sms.service';
import { EncryptionService } from '../../common/encryption/encryption.service';
import { UsersService } from '../../users/users.service';
import { NotificationsService } from '../../notifications/notifications.service';
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
    private readonly prisma:         PrismaService,
    private readonly balanceService: BalanceService,
    private readonly smsService:     SmsService,
    private readonly enc:            EncryptionService,
    private readonly usersService:   UsersService,
    private readonly notifications:  NotificationsService,
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

    // 1. Fetch schedule + user preferences
    const [schedule, prefs] = await Promise.all([
      this.prisma.schedule.findUnique({
        where: { id: scheduleId },
        include: { user: { select: { phone: true, name: true } } },
      }),
      this.usersService.getPreferences(userId),
    ]);

    if (!schedule) { this.logger.warn(`[BalanceCheck] Schedule ${scheduleId} not found`); return; }
    if (schedule.status !== ScheduleStatus.ACTIVE) { return; }

    // 2. Check balance
    const result    = await this.balanceService.getBalance(userId, schedule.provider);
    const sufficient = result.balance >= schedule.amount;
    const shortRef   = `"${schedule.name}"`;

    this.logger.log(`[BalanceCheck] ${schedule.provider} balance: ${result.balance} | Required: ${schedule.amount} | Sufficient: ${sufficient}`);

    if (sufficient) {
      const msg = window === '24 hours'
        ? `PaySmart: Scheduled payment ${shortRef} of NPR ${schedule.amount} will execute TOMORROW. Balance NPR ${result.balance} ✓`
        : `PaySmart: Scheduled payment ${shortRef} of NPR ${schedule.amount} executes in ~1 HOUR. Balance NPR ${result.balance} ✓`;

      // ── SMS Reminder (honours smsReminder preference) ──
      if (prefs.smsReminder && schedule.user.phone) {
        this.smsService.send(this.enc.decrypt(schedule.user.phone), msg);
        this.logger.log(`[BalanceCheck] SMS sent (smsReminder=ON) for schedule ${scheduleId}`);
      }

      // ── Push Notification (honours pushNotification preference) ──
      if (prefs.pushNotification) {
        await this.notifications.sendNotification(userId, 'SCHEDULE_REMINDER' as any, `Payment due — ${window}`, msg, {
          scheduleId, amount: schedule.amount, recipientId: schedule.recipientId,
          provider: schedule.provider, scheduleName: schedule.name,
        });
      } else {
        // Still save in DB (no WS/FCM push)
        await this.saveNotification(userId, NotificationType.SCHEDULE_REMINDER, {
          title: `Payment due — ${window}`, body: msg,
          scheduleId, balance: result.balance, amount: schedule.amount,
        });
      }
    } else {
      const shortfall = schedule.amount - result.balance;
      const alertMsg  = `PaySmart ALERT: Low balance for ${shortRef}. Need NPR ${schedule.amount} | Have NPR ${result.balance} | Shortfall NPR ${shortfall}. Top up within ${window}.`;

      // Always send low-balance alert regardless of preferences (critical)
      if (schedule.user.phone) {
        this.smsService.send(this.enc.decrypt(schedule.user.phone), alertMsg);
      }
      await this.notifications.sendNotification(userId, 'PAYMENT_FAILED' as any, 'Low balance — payment at risk', alertMsg, {
        scheduleId, balance: result.balance, required: schedule.amount, shortfall, sufficient: false,
      });
      this.logger.warn(`[BalanceCheck] LOW BALANCE — user ${userId}, schedule ${scheduleId}, shortfall: NPR ${shortfall}`);
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
