import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { BillStatus, ScheduleStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SmsService } from '../sms/sms.service';
import { SmsTemplates } from '../sms/sms.templates';
import { EncryptionService } from '../common/encryption/encryption.service';
import { BillInquiryService } from '../bill-inquiry/bill-inquiry.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import {
  PAYMENT_QUEUE,
  SCHEDULE_QUEUE,
  EXECUTE_PAYMENT_JOB,
  BALANCE_CHECK_DAY_JOB,
  BALANCE_CHECK_HOUR_JOB,
  ONE_DAY_MS,
  ONE_HOUR_MS,
} from '../queue/queue.constants';

@Injectable()
export class ScheduleService {
  private readonly logger = new Logger(ScheduleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly smsService: SmsService,
    private readonly enc: EncryptionService,
    private readonly billInquiry: BillInquiryService,
    @InjectQueue(PAYMENT_QUEUE) private readonly paymentQueue: Queue,
    @InjectQueue(SCHEDULE_QUEUE) private readonly scheduleQueue: Queue,
  ) { }

  // ─── CRUD ─────────────────────────────────────────────────────────────────

  async create(userId: string, dto: CreateScheduleDto) {
    const nextRunAt = new Date(dto.nextRunAt);

    if (nextRunAt <= new Date()) {
      throw new BadRequestException('nextRunAt must be a future date');
    }

    const schedule = await this.prisma.schedule.create({
      data: { ...dto, userId, nextRunAt },
    });

    this.logger.log(`Schedule created: ${schedule.id} for user: ${userId}`);

    // Enqueue the pre-flight balance check jobs (non-fatal — cron will pick up if Redis is down)
    try {
      await this.enqueueBalanceChecks(schedule.id, userId, nextRunAt);
    } catch (queueErr) {
      this.logger.warn(
        `[Queue] Could not enqueue balance-check jobs for schedule ${schedule.id} ` +
        `(Redis may be unavailable): ${queueErr.message}`,
      );
    }

    // Confirmation SMS
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true },
    });
    if (user?.phone) {
      this.smsService.send(
        user.phone,
        SmsTemplates.scheduleCreated(schedule.name, schedule.amount, nextRunAt),
      );
    }

    return schedule;
  }

  async findAllByUser(userId: string) {
    return this.prisma.schedule.findMany({
      where: { userId },
      orderBy: { nextRunAt: 'asc' },
    });
  }

  async findOne(id: string, userId: string) {
    const schedule = await this.prisma.schedule.findFirst({ where: { id, userId } });
    if (!schedule) throw new NotFoundException('Schedule not found');
    return schedule;
  }

  async update(id: string, userId: string, dto: UpdateScheduleDto) {
    const schedule = await this.findOne(id, userId);

    if (schedule.status === ScheduleStatus.CANCELLED) {
      throw new BadRequestException('Cannot update a cancelled schedule');
    }

    const updated = await this.prisma.schedule.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.nextRunAt ? { nextRunAt: new Date(dto.nextRunAt) } : {}),
      },
    });

    // If nextRunAt changed, reschedule balance checks (non-fatal)
    if (dto.nextRunAt) {
      try {
        await this.removeBalanceCheckJobs(id);
        await this.enqueueBalanceChecks(id, userId, new Date(dto.nextRunAt));
      } catch (queueErr) {
        this.logger.warn(`[Queue] Could not reschedule balance-check jobs: ${queueErr.message}`);
      }
    }

    return updated;
  }

  async pause(id: string, userId: string) {
    const schedule = await this.findOne(id, userId);
    if (schedule.status !== ScheduleStatus.ACTIVE) {
      throw new BadRequestException(`Schedule is already ${schedule.status}`);
    }
    // Non-fatal — Redis may be unavailable
    try { await this.removeBalanceCheckJobs(id); }
    catch (e) { this.logger.warn(`[Queue] removeBalanceCheckJobs failed on pause: ${e.message}`); }

    return this.prisma.schedule.update({
      where: { id },
      data: { status: ScheduleStatus.PAUSED },
    });
  }

  async resume(id: string, userId: string) {
    const schedule = await this.findOne(id, userId);
    if (schedule.status !== ScheduleStatus.PAUSED) {
      throw new BadRequestException('Only PAUSED schedules can be resumed');
    }
    const updated = await this.prisma.schedule.update({
      where: { id },
      data: { status: ScheduleStatus.ACTIVE },
    });
    // Non-fatal — cron sweeps will re-enqueue if Redis comes back
    try { await this.enqueueBalanceChecks(id, userId, schedule.nextRunAt); }
    catch (e) { this.logger.warn(`[Queue] enqueueBalanceChecks failed on resume: ${e.message}`); }
    return updated;
  }

  async cancel(id: string, userId: string) {
    const schedule = await this.findOne(id, userId);
    if (schedule.status === ScheduleStatus.CANCELLED) {
      throw new BadRequestException('Schedule is already cancelled');
    }
    // Non-fatal — Redis may be unavailable
    try { await this.removeBalanceCheckJobs(id); }
    catch (e) { this.logger.warn(`[Queue] removeBalanceCheckJobs failed on cancel: ${e.message}`); }

    return this.prisma.schedule.update({
      where: { id },
      data: { status: ScheduleStatus.CANCELLED },
    });
  }

  // ─── Balance check job helpers ────────────────────────────────────────────

  /**
   * Enqueue two delayed balance-check jobs for a schedule's next run.
   * Uses deterministic job IDs so re-running never duplicates them.
   */
  async enqueueBalanceChecks(scheduleId: string, userId: string, nextRunAt: Date) {
    const now = Date.now();
    const runMs = nextRunAt.getTime();

    const dayDelay = runMs - ONE_DAY_MS - now;
    const hourDelay = runMs - ONE_HOUR_MS - now;

    const payload = { scheduleId, userId };

    if (dayDelay > 0) {
      await this.scheduleQueue.add(BALANCE_CHECK_DAY_JOB, payload, {
        delay: dayDelay,
        jobId: `${scheduleId}-1day`,
        removeOnComplete: true,
        removeOnFail: false,
      });
      this.logger.log(
        `[BalanceCheck] 1-day job queued for schedule ${scheduleId} ` +
        `(fires in ${Math.round(dayDelay / 60_000)} min)`,
      );
    }

    if (hourDelay > 0) {
      await this.scheduleQueue.add(BALANCE_CHECK_HOUR_JOB, payload, {
        delay: hourDelay,
        jobId: `${scheduleId}-1hour`,
        removeOnComplete: true,
        removeOnFail: false,
      });
      this.logger.log(
        `[BalanceCheck] 1-hour job queued for schedule ${scheduleId} ` +
        `(fires in ${Math.round(hourDelay / 60_000)} min)`,
      );
    }

    // If nextRunAt is already within the next hour — check immediately
    if (dayDelay <= 0 && hourDelay <= 0) {
      await this.scheduleQueue.add(BALANCE_CHECK_HOUR_JOB, { ...payload, checkType: '1hour' }, {
        jobId: `${scheduleId}-immediate`,
        removeOnComplete: true,
      });
      this.logger.log(`[BalanceCheck] Immediate check queued for schedule ${scheduleId}`);
    }
  }

  /** Return queue status of both balance-check jobs for a schedule. */
  async getBalanceCheckJobStatus(scheduleId: string) {
    const [dayJob, hourJob] = await Promise.all([
      this.scheduleQueue.getJob(`${scheduleId}-1day`),
      this.scheduleQueue.getJob(`${scheduleId}-1hour`),
    ]);

    const describe = async (job: any, label: string) => {
      if (!job) return { label, queued: false };
      const state = await job.getState();
      return { label, queued: true, state, delay: job.opts.delay, processAt: new Date(job.timestamp + (job.opts.delay ?? 0)) };
    };

    return {
      scheduleId,
      jobs: await Promise.all([describe(dayJob, '1-day before'), describe(hourJob, '1-hour before')]),
    };
  }

  /** Remove any pending balance-check jobs when a schedule is paused/cancelled. */
  async removeBalanceCheckJobs(scheduleId: string) {
    for (const jobId of [`${scheduleId}-1day`, `${scheduleId}-1hour`, `${scheduleId}-immediate`]) {
      const job = await this.scheduleQueue.getJob(jobId);
      if (job) {
        await job.remove();
        this.logger.log(`[BalanceCheck] Removed job ${jobId}`);
      }
    }
  }

  // ─── Cron ① — every minute: enqueue due payment jobs ─────────────────────
  @Cron(CronExpression.EVERY_MINUTE)
  async processDueSchedules() {
    const dueSchedules = await this.prisma.schedule.findMany({
      where: { status: ScheduleStatus.ACTIVE, nextRunAt: { lte: new Date() } },
    });

    if (dueSchedules.length === 0) return;
    this.logger.log(`[Cron] Enqueueing ${dueSchedules.length} due payment(s)`);

    for (const schedule of dueSchedules) {
      await this.paymentQueue.add(
        EXECUTE_PAYMENT_JOB,
        { scheduleId: schedule.id, userId: schedule.userId },
        {
          jobId: `exec-${schedule.id}-${Date.now()}`,
          attempts: schedule.maxRetries,
          backoff: { type: 'exponential', delay: 5_000 },
          removeOnComplete: 100,
        },
      );

      // Increment execution count; auto-complete when maxOccurrences reached
      const newCount = schedule.executedCount + 1;
      const limitReached = schedule.maxOccurrences > 0 && newCount >= schedule.maxOccurrences;
      await this.prisma.schedule.update({
        where: { id: schedule.id },
        data: {
          executedCount: newCount,
          ...(limitReached ? { status: ScheduleStatus.COMPLETED } : {}),
        },
      });

      if (limitReached) {
        this.logger.log(
          `[Cron] Schedule ${schedule.id} completed — reached maxOccurrences (${schedule.maxOccurrences})`,
        );
      }
    }
  }

  // ─── Cron ② — every hour: 24-hour balance-check sweep ────────────────────
  /**
   * Catches any schedules that were created before the app started
   * or whose balance-check delayed job was lost (Redis restart, etc.).
   * Window: nextRunAt is between 23 h and 25 h from now.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async sweepDayBeforeBalanceChecks() {
    const now = new Date();
    const windowStart = new Date(now.getTime() + 23 * ONE_HOUR_MS);
    const windowEnd = new Date(now.getTime() + 25 * ONE_HOUR_MS);

    const schedules = await this.prisma.schedule.findMany({
      where: {
        status: ScheduleStatus.ACTIVE,
        nextRunAt: { gte: windowStart, lte: windowEnd },
      },
      select: { id: true, userId: true, nextRunAt: true },
    });

    if (schedules.length === 0) return;
    this.logger.log(`[Cron 24h sweep] Found ${schedules.length} schedule(s) due tomorrow`);

    for (const s of schedules) {
      const alreadyQueued = await this.scheduleQueue.getJob(`${s.id}-1day`);
      if (!alreadyQueued) {
        await this.scheduleQueue.add(
          BALANCE_CHECK_DAY_JOB,
          { scheduleId: s.id, userId: s.userId },
          { jobId: `${s.id}-1day`, removeOnComplete: true },
        );
      }
    }
  }

  // ─── Cron ③ — every 10 min: 1-hour balance-check sweep ──────────────────
  /**
   * Window: nextRunAt is between 50 min and 70 min from now.
   */
  @Cron('*/10 * * * *')
  async sweepHourBeforeBalanceChecks() {
    const now = new Date();
    const windowStart = new Date(now.getTime() + 50 * 60 * 1000);
    const windowEnd = new Date(now.getTime() + 70 * 60 * 1000);

    const schedules = await this.prisma.schedule.findMany({
      where: {
        status: ScheduleStatus.ACTIVE,
        nextRunAt: { gte: windowStart, lte: windowEnd },
      },
      select: { id: true, userId: true, nextRunAt: true },
    });

    if (schedules.length === 0) return;
    this.logger.log(`[Cron 1h sweep] Found ${schedules.length} schedule(s) due in ~1 hour`);

    for (const s of schedules) {
      const alreadyQueued = await this.scheduleQueue.getJob(`${s.id}-1hour`);
      if (!alreadyQueued) {
        await this.scheduleQueue.add(
          BALANCE_CHECK_HOUR_JOB,
          { scheduleId: s.id, userId: s.userId },
          { jobId: `${s.id}-1hour`, removeOnComplete: true },
        );
      }
    }
  }

  // ─── Cron ④ — every hour: multi-window bill reminders ───────────────────────
  /**
   * Sends in-app + SMS reminders for bills in 3 time windows:
   *   • Within 24 h  → "⚠️ [Payee] bill of NPR X due in Y hours"
   *   • 1–3 days     → "⚠️ [Payee] bill of NPR X due in Y days"
   *   • 3–7 days     → "⚠️ [Payee] bill of NPR X due in Y days"
   * Deduplication: skips if a BILL_DUE notification for this bill was already
   * created in the last 20 h (prevents hourly spam).
   */
  @Cron(CronExpression.EVERY_HOUR)
  async sendMultiWindowBillReminders() {
    const now = new Date();
    const windows = [
      { key: '24h',  fromH: 0,  toH: 24  },
      { key: '3day', fromH: 24, toH: 72  },
      { key: '7day', fromH: 72, toH: 168 },
    ];

    for (const win of windows) {
      const windowStart = new Date(now.getTime() + win.fromH * 3_600_000);
      const windowEnd   = new Date(now.getTime() + win.toH   * 3_600_000);

      const bills = await this.prisma.bill.findMany({
        where: {
          status:  { in: ['PENDING', 'OVERDUE'] as any },
          dueDate: { gte: windowStart, lte: windowEnd },
        },
        include: {
          user:     { select: { phone: true } },
          merchant: { select: { name: true } },
        },
      });

      if (bills.length === 0) continue;
      this.logger.log(`[BillReminder ${win.key}] ${bills.length} bill(s) in window`);

      for (const bill of bills) {
        // Deduplicate: skip if we already sent a notification for this bill in last 20 h
        const alreadySent = await this.prisma.notification.findFirst({
          where: {
            userId:    bill.userId,
            type:      'BILL_DUE',
            createdAt: { gte: new Date(now.getTime() - 20 * 3_600_000) },
            metadata:  { path: ['billId'], equals: bill.id } as any,
          },
        });
        if (alreadySent) continue;

        const hoursLeft = Math.ceil((bill.dueDate.getTime() - now.getTime()) / 3_600_000);
        const timeLabel = hoursLeft <= 1
          ? '1 hour'
          : hoursLeft < 24
            ? `${hoursLeft} hours`
            : hoursLeft < 48 ? '1 day' : `${Math.ceil(hoursLeft / 24)} days`;

        const title = `⚠️ ${bill.merchant.name} bill due in ${timeLabel}`;
        const body  = `NPR ${bill.amount.toLocaleString()} due in ${timeLabel}. Pay now to avoid late charges.`;

        // Create in-app notification
        await this.prisma.notification.create({
          data: {
            userId:   bill.userId,
            type:     'BILL_DUE',
            title,
            body,
            metadata: {
              billId:         bill.id,
              merchantName:   bill.merchant.name,
              amount:         bill.amount,
              dueDate:        bill.dueDate.toISOString(),
              reminderWindow: win.key,
            },
          },
        });

        // SMS reminder (non-fatal)
        if (bill.user.phone) {
          try {
            this.smsService.send(
              this.enc.decrypt(bill.user.phone),
              `⚠️ ${bill.merchant.name} bill of NPR ${bill.amount.toLocaleString()} due in ${timeLabel}. Open PaySmart to pay.`,
            );
          } catch (smsErr) {
            this.logger.warn(`[BillReminder] SMS failed for bill ${bill.id}: ${smsErr.message}`);
          }
        }
      }
    }
  }

  // ─── Cron ⑥ — every hour: bill inquiry poll for all biller accounts ────────
  /**
   * Iterates all users' biller accounts whose merchant has a billInquiryUrl,
   * calls checkBillForAccount for each, and fires-and-forgets per account so
   * one failure never blocks the rest.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async pollBillInquiries(): Promise<void> {
    this.logger.log('[BillInquiryPoll] Starting hourly bill inquiry poll');

    const accounts = await this.prisma.billerAccount.findMany({
      where: {
        merchant: { billInquiryUrl: { not: null }, isActive: true },
        user:     { isActive: true },
      },
      select: { id: true, userId: true },
    });

    if (accounts.length === 0) {
      this.logger.debug('[BillInquiryPoll] No accounts with billInquiryUrl — skipping');
      return;
    }

    this.logger.log(`[BillInquiryPoll] Polling ${accounts.length} account(s)`);

    await Promise.allSettled(
      accounts.map(async (account) => {
        try {
          await this.billInquiry.checkBillForAccount(account.id, account.userId);
        } catch (err) {
          this.logger.error(
            `[BillInquiryPoll] Error for account ${account.id}: ${err?.message}`,
          );
        }
      }),
    );

    this.logger.log('[BillInquiryPoll] Hourly poll done');
  }

  // ─── Cron ⑤ — 08:00 Nepal time: bill reminder SMS ────────────────────────
  @Cron('0 8 * * *', { timeZone: 'Asia/Kathmandu' })
  async sendBillReminders() {
    const now = new Date();

    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStart = new Date(tomorrow.setHours(0, 0, 0, 0));
    const tomorrowEnd = new Date(tomorrow.setHours(23, 59, 59, 999));

    const [overdue, dueTomorrow] = await Promise.all([
      this.prisma.bill.findMany({
        where: { status: BillStatus.PENDING, dueDate: { lt: now } },
        include: { user: { select: { phone: true } }, merchant: { select: { name: true } } },
      }),
      this.prisma.bill.findMany({
        where: { status: BillStatus.PENDING, dueDate: { gte: tomorrowStart, lte: tomorrowEnd } },
        include: { user: { select: { phone: true } }, merchant: { select: { name: true } } },
      }),
    ]);

    this.logger.log(`[BillReminder] overdue: ${overdue.length}, due tomorrow: ${dueTomorrow.length}`);

    for (const bill of overdue) {
      if (bill.user.phone) {
        this.smsService.send(this.enc.decrypt(bill.user.phone), SmsTemplates.billOverdue(bill.merchant.name, bill.amount));
      }
      await this.prisma.bill.update({ where: { id: bill.id }, data: { status: BillStatus.OVERDUE } });
    }

    for (const bill of dueTomorrow) {
      if (bill.user.phone) {
        this.smsService.send(this.enc.decrypt(bill.user.phone), SmsTemplates.billDueTomorrow(bill.merchant.name, bill.amount));
      }
    }
  }
}
