import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { TransactionStatus, SuggestionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EsewaSyncService } from './esewa-sync.service';
import { TransactionPayload } from './pattern-analysis.service';
import { TransactionAnalysisService } from './transaction-analysis.service';

export interface SyncSummary {
  userId: string;
  syncedAt: string;
  totalPendingChecked: number;
  statusUpdates: { completed: number; failed: number; refunded: number; unchanged: number };
  suggestionsSaved: number;
  confidenceScore: number;
  topRecurring: any[];
}

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);
  private readonly lookbackDays: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly esewaSyncService: EsewaSyncService,
    private readonly txnAnalysis: TransactionAnalysisService,
    private readonly configService: ConfigService,
  ) {
    this.lookbackDays = this.configService.get<number>('SYNC_LOOKBACK_DAYS', 90);
  }

  // ─── Cron: runs every 15 minutes for all active users ─────────────────────
  @Cron('*/15 * * * *')
  async syncAll() {
    this.logger.log('[Sync] Starting scheduled sync for all users');

    const users = await this.prisma.user.findMany({
      where: { isActive: true },
      select: { id: true },
    });

    const results = await Promise.allSettled(
      users.map((u) => this.syncUser(u.id)),
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed    = results.filter((r) => r.status === 'rejected').length;
    this.logger.log(`[Sync] Completed — ${succeeded} ok / ${failed} failed`);
  }

  /**
   * Full sync for a single user:
   *  ① verify pending eSewa txns → update DB
   *  ② send completed txns to FastAPI
   *  ③ persist returned suggestions
   */
  async syncUser(userId: string): Promise<SyncSummary> {
    this.logger.log(`[Sync] Starting for user ${userId}`);

    // ── Step 1: fetch our PENDING eSewa transactions ─────────────────────────
    const pending = await this.prisma.transaction.findMany({
      where: {
        userId,
        provider: { in: ['ESEWA', 'esewa'] },
        status: TransactionStatus.PENDING,
        externalId: { not: null },
      },
      select: { id: true, externalId: true, amount: true },
    });

    // ── Step 2: verify each against eSewa sandbox API ─────────────────────────
    const counters = { completed: 0, failed: 0, refunded: 0, unchanged: 0 };

    if (pending.length > 0) {
      const verified = await this.esewaSyncService.verifyBatch(
        pending.map((t) => ({ externalId: t.externalId!, amount: t.amount })),
      );

      // Bulk-update in a Prisma transaction
      await this.prisma.$transaction(
        verified
          .filter((v) => v.newStatus !== TransactionStatus.PENDING)
          .map((v) => {
            if (v.newStatus === TransactionStatus.COMPLETED) counters.completed++;
            else if (v.newStatus === TransactionStatus.FAILED) counters.failed++;
            else if (v.newStatus === TransactionStatus.REFUNDED) counters.refunded++;

            return this.prisma.transaction.updateMany({
              where: { externalId: v.externalId, userId },
              data: {
                status: v.newStatus,
                ...(v.newStatus === TransactionStatus.COMPLETED
                  ? { completedAt: new Date() }
                  : {}),
              },
            });
          }),
      );

      counters.unchanged =
        pending.length - counters.completed - counters.failed - counters.refunded;
    }

    // ── Step 3: collect completed txns for pattern analysis ───────────────────
    const since = new Date();
    since.setDate(since.getDate() - this.lookbackDays);

    const completedTxns = await this.prisma.transaction.findMany({
      where: {
        userId,
        status: TransactionStatus.COMPLETED,
        createdAt: { gte: since },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    const payload: TransactionPayload[] = completedTxns.map((t) => ({
      id:          t.id,
      amount:      t.amount,
      type:        t.type,
      status:      t.status,
      provider:    t.provider,
      description: t.description,
      createdAt:   t.createdAt.toISOString(),
    }));

    // ── Step 4: POST /analyze/transactions → FastAPI, save suggestions + WS nudge
    const analysis = await this.txnAnalysis.analyzeAndNotify(userId, payload);

    const summary: SyncSummary = {
      userId,
      syncedAt:            new Date().toISOString(),
      totalPendingChecked: pending.length,
      statusUpdates:       counters,
      suggestionsSaved:    analysis.suggestionsSaved,
      confidenceScore:     analysis.confidenceScore,
      topRecurring:        analysis.topRecurring,
    };

    this.logger.log(
      `[Sync] Done for ${userId}: ${JSON.stringify(counters)}, ` +
      `${analysis.suggestionsSaved} suggestions, confidence=${analysis.confidenceScore}`,
    );
    return summary;
  }

  /** Fetch pending suggestions produced by the last pattern analysis run. */
  async getPendingSuggestions(userId: string) {
    return this.prisma.suggestion.findMany({
      where: { userId, status: SuggestionStatus.PENDING },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }
}
