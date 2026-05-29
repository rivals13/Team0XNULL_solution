import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { BillStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NeaService } from './billers/nea.service';
import { VianetService } from './billers/vianet.service';
import { BillResult } from './billers/nea.service';
import { BILLER_POLL_QUEUE, POLL_ALL_BILLERS_JOB } from '../queue/queue.constants';

/** Biller slugs we can poll — extend as new billers are onboarded. */
const SUPPORTED_SLUGS = ['nea', 'vianet'] as const;
type SupportedSlug = (typeof SUPPORTED_SLUGS)[number];

interface PollSummary {
  polledAccounts: number;
  billsSaved: number;
  errors: number;
  runAt: string;
}

@Injectable()
export class BillerPollService {
  private readonly logger = new Logger(BillerPollService.name);

  constructor(
    private readonly prisma:         PrismaService,
    private readonly notifications:  NotificationsService,
    private readonly nea:            NeaService,
    private readonly vianet:         VianetService,
    @InjectQueue(BILLER_POLL_QUEUE)
    private readonly pollQueue:      Queue,
  ) {}

  // ─── Daily cron — 08:00 Nepal time → enqueues a Bull job ────────────────

  @Cron('0 8 * * *', { timeZone: 'Asia/Kathmandu', name: 'biller-daily-poll' })
  async scheduleDailyPoll(): Promise<void> {
    this.logger.log('[BillerPoll] Cron fired — enqueuing poll job to Bull Queue');
    const job = await this.pollQueue.add(
      POLL_ALL_BILLERS_JOB,
      { triggeredBy: 'cron', triggeredAt: new Date().toISOString() },
      {
        attempts:         1,          // single attempt; retry logic lives in biller services
        removeOnComplete: 50,
        removeOnFail:     20,
      },
    );
    this.logger.log(`[BillerPoll] Poll job enqueued — jobId: ${job.id}`);
  }

  // ─── Core poll logic (called by the processor) ────────────────────────────

  async executePoll(): Promise<PollSummary> {
    this.logger.log('[BillerPoll] Poll started');

    const accounts = await this.prisma.billerAccount.findMany({
      where: {
        merchant: { slug: { in: [...SUPPORTED_SLUGS] }, isActive: true },
        user:     { isActive: true },
      },
      include: {
        merchant: { select: { id: true, name: true, slug: true } },
        user:     { select: { id: true } },
      },
    });

    this.logger.log(`[BillerPoll] Found ${accounts.length} accounts to poll`);

    let billsSaved = 0;
    let errors     = 0;

    await Promise.allSettled(
      accounts.map(async (account) => {
        try {
          const slug   = account.merchant.slug as SupportedSlug;
          const result = await this.fetchBill(slug, account.accountNumber);

          if (!result.found || !result.amount) return;

          const saved = await this.upsertBill(account, result);
          if (saved) {
            billsSaved++;
            await this.notifyUser(account.user.id, account.merchant.name, result);
          }
        } catch (err) {
          errors++;
          this.logger.error(
            `[BillerPoll] Error processing account ${account.id}: ${err?.message}`,
          );
        }
      }),
    );

    const summary: PollSummary = {
      polledAccounts: accounts.length,
      billsSaved,
      errors,
      runAt: new Date().toISOString(),
    };

    this.logger.log(
      `[BillerPoll] Poll done — polled: ${accounts.length}, saved: ${billsSaved}, errors: ${errors}`,
    );
    return summary;
  }

  // ─── Admin / test manual trigger (enqueues immediately) ──────────────────

  async triggerPollNow(): Promise<{ jobId: string; message: string }> {
    const job = await this.pollQueue.add(
      POLL_ALL_BILLERS_JOB,
      { triggeredBy: 'manual', triggeredAt: new Date().toISOString() },
      { attempts: 1, removeOnComplete: 10, removeOnFail: 10 },
    );
    this.logger.log(`[BillerPoll] Manual poll job enqueued — jobId: ${job.id}`);
    return { jobId: String(job.id), message: 'Poll job enqueued. Check logs for results.' };
  }

  // ─── Internals ────────────────────────────────────────────────────────────

  private async fetchBill(slug: SupportedSlug, accountNumber: string): Promise<BillResult> {
    switch (slug) {
      case 'nea':    return this.nea.fetchBill(accountNumber);
      case 'vianet': return this.vianet.fetchBill(accountNumber);
      default:
        this.logger.warn(`[BillerPoll] Unknown slug '${slug}' — skipping`);
        return { found: false };
    }
  }

  /**
   * Upserts the bill — deduplicates by (billerAccountId + billingPeriod).
   * Only inserts if no existing PENDING bill for this period exists.
   * Returns true when a new bill was inserted.
   */
  private async upsertBill(
    account: { id: string; userId: string; merchantId: string },
    result: BillResult,
  ): Promise<boolean> {
    const billingPeriod = result.billingPeriod ?? this.currentPeriod();

    // Check for existing bill this period (avoid duplicates across daily runs)
    const existing = await this.prisma.bill.findFirst({
      where: {
        billerAccountId: account.id,
        billingPeriod,
        status:          { not: BillStatus.CANCELLED },
      },
      select: { id: true, status: true },
    });

    if (existing) {
      this.logger.debug(
        `[BillerPoll] Bill already exists for account ${account.id} period ${billingPeriod} (status: ${existing.status})`,
      );
      return false;
    }

    await this.prisma.bill.create({
      data: {
        userId:          account.userId,
        merchantId:      account.merchantId,
        billerAccountId: account.id,
        amount:          result.amount,
        dueDate:         result.dueDate,
        billingPeriod,
        status:          BillStatus.PENDING,
        description:     result.description,
      },
    });

    this.logger.log(
      `[BillerPoll] New bill saved — account ${account.id}, period ${billingPeriod}, amount ${result.amount}`,
    );

    return true;
  }

  /**
   * Sends a BILL_DUE WebSocket notification (+ FCM) to the user.
   * Uses the generic sendNotification so the notification is also persisted in DB.
   */
  private async notifyUser(
    userId: string,
    merchantName: string,
    result: BillResult,
  ): Promise<void> {
    try {
      const daysUntilDue = result.dueDate
        ? Math.ceil((result.dueDate.getTime() - Date.now()) / 86_400_000)
        : null;

      const dueLine = daysUntilDue !== null
        ? daysUntilDue <= 0
          ? 'Due today!'
          : daysUntilDue === 1
            ? 'Due tomorrow.'
            : `Due in ${daysUntilDue} days.`
        : '';

      await this.notifications.sendNotification(
        userId,
        'BILL_DUE',
        `New ${merchantName} bill`,
        `NPR ${result.amount?.toFixed(2)} for ${result.billingPeriod ?? 'this period'}. ${dueLine}`.trim(),
        {
          merchantName,
          amount:        result.amount,
          dueDate:       result.dueDate?.toISOString(),
          billingPeriod: result.billingPeriod,
        },
      );
    } catch (err) {
      // Never let notification failure abort the poll
      this.logger.warn(`[BillerPoll] Failed to notify user ${userId}: ${err?.message}`);
    }
  }

  private currentPeriod(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }
}
