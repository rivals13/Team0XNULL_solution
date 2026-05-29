import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { SuggestionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PatternAnalysisService, TransactionPayload } from '../sync/pattern-analysis.service';
import { PushTransactionsDto } from './dto/push-transactions.dto';

export interface PushResult {
  received: number;
  savedToDb: number;
  suggestions: Array<{
    type: string;
    title: string;
    body: string;
    confidence: number;
  }>;
  analyzedAt: string;
}

@Injectable()
export class ExternalWalletService {
  private readonly logger = new Logger(ExternalWalletService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly patternAnalysis: PatternAnalysisService,
  ) {}

  async pushTransactions(dto: PushTransactionsDto, appName: string): Promise<PushResult> {
    // ── 1. Verify the PaySmart user exists ───────────────────────────────────
    const user = await this.prisma.user.findUnique({
      where: { id: dto.user_id },
      select: { id: true },
    });
    if (!user) {
      throw new NotFoundException(
        `PaySmart user '${dto.user_id}' not found. ` +
        `Ensure the user has linked your app (source: ${dto.app_source}).`,
      );
    }

    // ── 2. Persist incoming transactions as EXTERNAL / COMPLETED ─────────────
    let savedToDb = 0;
    const transactionRecords: TransactionPayload[] = [];

    for (const txn of dto.transactions) {
      try {
        const saved = await this.prisma.transaction.create({
          data: {
            userId:      user.id,
            amount:      txn.amount,
            type:        'DEBIT',
            status:      'COMPLETED',
            provider:    dto.app_source,       // external app as provider
            recipientId: txn.payee,
            description: txn.description ?? txn.payee,
            completedAt: new Date(txn.date),
          },
        });
        savedToDb++;
        transactionRecords.push({
          id:          saved.id,
          amount:      saved.amount,
          type:        saved.type,
          status:      saved.status,
          provider:    saved.provider,
          description: saved.description,
          createdAt:   new Date(txn.date).toISOString(),
        });
      } catch (err) {
        // Duplicate externalId or constraint — log and continue
        this.logger.warn(`[ExternalWallet] Skipped txn from ${dto.app_source}: ${err.message}`);
      }
    }

    this.logger.log(
      `[ExternalWallet] ${appName} pushed ${dto.transactions.length} txns for user ${user.id} — saved: ${savedToDb}`,
    );

    // ── 3. Send all the user's transactions (not just the new ones) to FastAPI
    //       so patterns are analysed across the full history.
    const allTxns = await this.prisma.transaction.findMany({
      where: { userId: user.id, status: 'COMPLETED' },
      orderBy: { createdAt: 'desc' },
      take: 500,
      select: {
        id: true, amount: true, type: true, status: true,
        provider: true, description: true, createdAt: true,
      },
    });

    const payload: TransactionPayload[] = allTxns.map((t) => ({
      id:          t.id,
      amount:      t.amount,
      type:        t.type,
      status:      t.status,
      provider:    t.provider,
      description: t.description,
      createdAt:   t.createdAt.toISOString(),
    }));

    const analysis = await this.patternAnalysis.analyze(user.id, payload);

    // ── 4. Persist suggestions returned by FastAPI ────────────────────────────
    if (analysis.suggestions.length > 0) {
      await this.prisma.suggestion.createMany({
        data: analysis.suggestions.map((s) => ({
          userId:    user.id,
          type:      s.type,
          title:     s.title,
          body:      s.body,
          status:    SuggestionStatus.PENDING,
          metadata:  { confidence: s.confidence, source: dto.app_source, ...(s.metadata ?? {}) } as any,
          expiresAt: s.confidence < 0.6
            ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            : null,
        })),
        skipDuplicates: true,
      });
    }

    // ── 5. Return suggestions directly to the calling app ────────────────────
    return {
      received:    dto.transactions.length,
      savedToDb,
      analyzedAt:  analysis.analyzedAt,
      suggestions: analysis.suggestions.map((s) => ({
        type:       s.type,
        title:      s.title,
        body:       s.body,
        confidence: s.confidence,
      })),
    };
  }
}
