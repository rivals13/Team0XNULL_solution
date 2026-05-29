import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { SuggestionType } from '@prisma/client';

// ─── Shapes that mirror your FastAPI response schema ─────────────────────────

export interface TransactionPayload {
  id: string;
  amount: number;
  type: string;
  status: string;
  provider: string | null;
  description: string | null;
  createdAt: string;
}

export interface PatternResult {
  avgMonthlySpend: number;
  topProviders: string[];
  recurringPayments: Array<{
    provider: string;
    avgAmount: number;
    frequency: string;
  }>;
  anomalies: Array<{
    transactionId: string;
    reason: string;
  }>;
}

export interface AnalysisSuggestion {
  type: SuggestionType;
  title: string;
  body: string;
  confidence: number;
  metadata?: Record<string, any>;
}

export interface AnalysisResponse {
  userId: string;
  analyzedAt: string;
  patterns: PatternResult;
  suggestions: AnalysisSuggestion[];
}

@Injectable()
export class PatternAnalysisService {
  private readonly logger = new Logger(PatternAnalysisService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>('FASTAPI_BASE_URL', 'http://localhost:8000');
    this.apiKey  = this.configService.get<string>('FASTAPI_API_KEY', '');
  }

  /**
   * POST the user's transactions to FastAPI and return pattern + suggestions.
   * Falls back to an empty result if FastAPI is unreachable (non-blocking).
   */
  async analyze(userId: string, transactions: TransactionPayload[]): Promise<AnalysisResponse> {
    try {
      this.logger.log(`[PatternAnalysis] Sending ${transactions.length} txns for user ${userId}`);

      const { data } = await firstValueFrom(
        this.httpService.post<AnalysisResponse>(
          `${this.baseUrl}/analyze/patterns`,
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

      this.logger.log(
        `[PatternAnalysis] Got ${data.suggestions?.length ?? 0} suggestions for user ${userId}`,
      );
      return data;
    } catch (error) {
      this.logger.warn(
        `[PatternAnalysis] FastAPI unreachable (${error.message}). Returning empty analysis.`,
      );
      // Return a safe fallback so the sync job still completes
      return this.emptyResult(userId);
    }
  }

  private emptyResult(userId: string): AnalysisResponse {
    return {
      userId,
      analyzedAt: new Date().toISOString(),
      patterns: {
        avgMonthlySpend: 0,
        topProviders: [],
        recurringPayments: [],
        anomalies: [],
      },
      suggestions: [],
    };
  }
}
