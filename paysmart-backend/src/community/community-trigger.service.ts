import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

const COMMUNITY_THRESHOLD = 5;   // min number of peer payers to fire notification
const LOOKBACK_DAYS        = 7;   // days to look back when counting peer payments

@Injectable()
export class CommunityTriggerService {
  private readonly logger = new Logger(CommunityTriggerService.name);

  constructor(
    private readonly prisma:        PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Call this (fire-and-forget) after any COMPLETED payment is saved.
   *
   * Flow:
   *  1. Count distinct users who paid `payee` in the last 7 days.
   *  2. If that count > 5, find users who have EVER paid `payee` but NOT
   *     in the last 7 days → they are the "remaining" classmates.
   *  3. Push a SYSTEM notification to each of them.
   *
   * @param payerUserId  — the user who just completed the payment (exclude from notification)
   * @param payee        — Transaction.recipientId (merchant name / payee identifier)
   */
  async checkAndNotify(payerUserId: string, payee: string): Promise<void> {
    if (!payee) return;

    try {
      const since = new Date(Date.now() - LOOKBACK_DAYS * 86_400_000);

      // ── 1. How many distinct users paid this payee in the last 7 days? ───────
      const recentPayers = await this.prisma.transaction.groupBy({
        by:     ['userId'],
        where:  {
          recipientId: payee,
          status:      'COMPLETED',
          createdAt:   { gte: since },
        },
      });
      const recentCount = recentPayers.length;

      this.logger.debug(
        `[Community] payee="${payee}" recentPayers=${recentCount} threshold=${COMMUNITY_THRESHOLD}`,
      );

      if (recentCount <= COMMUNITY_THRESHOLD) return;

      const recentPayerIds = new Set(recentPayers.map((r) => r.userId));

      // ── 2. Find users who have EVER paid this payee but NOT recently ─────────
      //       (they are in the same "institution" but haven't paid this week yet)
      const everPaidRows = await this.prisma.transaction.groupBy({
        by:    ['userId'],
        where: {
          recipientId: payee,
          status:      'COMPLETED',
          userId:      { not: payerUserId },   // exclude the person who just paid
        },
      });

      const remainingUserIds = everPaidRows
        .map((r) => r.userId)
        .filter((id) => !recentPayerIds.has(id));   // exclude recent payers

      if (remainingUserIds.length === 0) return;

      this.logger.log(
        `[Community] Notifying ${remainingUserIds.length} remaining users about payee="${payee}"`,
      );

      // ── 3. Send notification to each remaining user (fire-and-forget per user) ─
      const title = `Your classmates are paying ${payee} this week`;
      const body  = `${recentCount} people in your community have already paid ${payee}. Don't forget yours!`;

      await Promise.allSettled(
        remainingUserIds.map((userId) =>
          this.notifications.sendNotification(userId, 'SYSTEM', title, body, {
            payee,
            recentPayersCount: recentCount,
            source:            'community_trigger',
          }),
        ),
      );
    } catch (err) {
      // Never let community check crash the caller
      this.logger.error(`[Community] checkAndNotify failed for payee="${payee}": ${err?.message}`);
    }
  }
}
