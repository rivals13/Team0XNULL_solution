import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { SuggestionStatus, SuggestionType } from '@prisma/client';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TransactionPayload } from './pattern-analysis.service';

// ─── FastAPI response types ────────────────────────────────────────────────────

interface RecurringPayment {
  payee:       string;
  avg_amount:  number;
  frequency:   string;   // 'weekly' | 'monthly' | 'biweekly' ...
  confidence:  number;   // 0–1
}

interface AnalysisPatterns {
  avg_monthly_spend:  number;
  top_payees:         string[];
  recurring_payments: RecurringPayment[];
}

interface RawSuggestion {
  type:        string;
  title:       string;
  body:        string;
  confidence:  number;
  metadata?:   Record<string, any>;
}

interface TransactionAnalysisResponse {
  user_id:          string;
  analyzed_at:      string;
  confidence_score: number;    // overall confidence, 0–1
  patterns:         AnalysisPatterns;
  suggestions:      RawSuggestion[];
}

// ─── Public result ────────────────────────────────────────────────────────────

export interface AnalysisResult {
  analyzedAt:       string;
  confidenceScore:  number;
  suggestionsSaved: number;
  topRecurring:     RecurringPayment[];
}

// confidence threshold for firing automation nudge
const AUTOMATION_CONFIDENCE = 0.65;

@Injectable()
export class TransactionAnalysisService {
  private readonly logger  = new Logger(TransactionAnalysisService.name);
  private readonly baseUrl: string;
  private readonly apiKey:  string;

  constructor(
    private readonly http:          HttpService,
    private readonly config:        ConfigService,
    private readonly prisma:        PrismaService,
    private readonly notifications: NotificationsService,
  ) {
    this.baseUrl = this.config.get<string>('FASTAPI_BASE_URL', 'http://localhost:8000');
    this.apiKey  = this.config.get<string>('FASTAPI_API_KEY', '');
  }

  /**
   * Main entry point called by SyncService after every sync cycle.
   *
   * 1. POST /analyze/transactions → FastAPI
   * 2. Save returned suggestions to DB (skip duplicates)
   * 3. For each high-confidence recurring payment → WebSocket nudge
   */
  async analyzeAndNotify(
    userId:       string,
    transactions: TransactionPayload[],
  ): Promise<AnalysisResult> {
    if (transactions.length === 0) {
      return { analyzedAt: new Date().toISOString(), confidenceScore: 0, suggestionsSaved: 0, topRecurring: [] };
    }

    const data = await this.callFastApi(userId, transactions);

    // ── 1. Persist suggestions ─────────────────────────────────────────────
    const suggestionsSaved = await this.saveSuggestions(userId, data.suggestions);

    // ── 2. WS nudge for high-confidence recurring patterns ─────────────────
    await this.notifyRecurring(userId, data.patterns?.recurring_payments ?? []);

    const topRecurring = (data.patterns?.recurring_payments ?? [])
      .filter((r) => r.confidence >= AUTOMATION_CONFIDENCE)
      .slice(0, 3);

    this.logger.log(
      `[TxnAnalysis] user=${userId} confidence=${data.confidence_score} ` +
      `suggestions=${suggestionsSaved} recurring=${topRecurring.length}`,
    );

    return {
      analyzedAt:      data.analyzed_at,
      confidenceScore: data.confidence_score,
      suggestionsSaved,
      topRecurring,
    };
  }

  // ─── FastAPI call ─────────────────────────────────────────────────────────

  private async callFastApi(
    userId:       string,
    transactions: TransactionPayload[],
  ): Promise<TransactionAnalysisResponse> {
    try {
      const { data } = await firstValueFrom(
        this.http.post<TransactionAnalysisResponse>(
          `${this.baseUrl}/analyze/transactions`,
          { user_id: userId, transactions },
          {
            timeout: 15_000,
            headers: {
              'Content-Type': 'application/json',
              ...(this.apiKey ? { 'X-API-Key': this.apiKey } : {}),
            },
          },
        ),
      );

      return data;
    } catch (err) {
      this.logger.warn(
        `[TxnAnalysis] FastAPI /analyze/transactions unreachable: ${err?.message}. Skipping.`,
      );
      // Safe fallback — sync still succeeds without AI analysis
      return {
        user_id:          userId,
        analyzed_at:      new Date().toISOString(),
        confidence_score: 0,
        patterns: { avg_monthly_spend: 0, top_payees: [], recurring_payments: [] },
        suggestions:      [],
      };
    }
  }

  // ─── Persist suggestions ──────────────────────────────────────────────────

  private async saveSuggestions(
    userId:      string,
    suggestions: RawSuggestion[],
  ): Promise<number> {
    if (!suggestions.length) return 0;

    const validTypes = new Set<string>(Object.values(SuggestionType));

    const rows = suggestions
      .filter((s) => validTypes.has(s.type))
      .map((s) => ({
        userId,
        type:      s.type as SuggestionType,
        title:     s.title,
        body:      s.body,
        status:    SuggestionStatus.PENDING,
        metadata:  { confidence: s.confidence, ...(s.metadata ?? {}) } as any,
        expiresAt: s.confidence < 0.6
          ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          : null,
      }));

    if (!rows.length) return 0;

    const result = await this.prisma.suggestion.createMany({
      data:           rows,
      skipDuplicates: true,
    });

    return result.count;
  }

  // ─── WebSocket automation nudge ───────────────────────────────────────────

  /**
   * For every high-confidence recurring payment, push a NEW_SUGGESTION
   * WebSocket notification: "We spotted a pattern! Want to automate [payee]?"
   */
  private async notifyRecurring(
    userId:   string,
    patterns: RecurringPayment[],
  ): Promise<void> {
    const highConfidence = patterns.filter(
      (r) => r.confidence >= AUTOMATION_CONFIDENCE && r.payee,
    );

    if (!highConfidence.length) return;

    // Avoid notification flood — cap at top 2 patterns per sync
    const toNotify = highConfidence
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 2);

    await Promise.allSettled(
      toNotify.map(async (pattern) => {
        const title = `We spotted a pattern! 💡`;
        const body  =
          `Want to automate your ${pattern.frequency} payment to ` +
          `${pattern.payee} (avg NPR ${Math.round(pattern.avg_amount)})? ` +
          `Set it up once and never miss it.`;

        await this.notifications.sendNotification(
          userId,
          'NEW_SUGGESTION',
          title,
          body,
          {
            payee:         pattern.payee,
            avg_amount:    pattern.avg_amount,
            frequency:     pattern.frequency,
            confidence:    pattern.confidence,
            action:        'create_schedule',
            source:        'transaction_analysis',
          },
        );
      }),
    );
  }
}
