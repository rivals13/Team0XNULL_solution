import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

export interface BalanceResult {
  provider: string;
  balance: number;
  currency: string;
  fetchedAt: Date;
  isMock: boolean;
}

@Injectable()
export class BalanceService {
  private readonly logger = new Logger(BalanceService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Fetch real-time wallet balance for the given provider.
   * eSewa / Khalti sandbox do not expose a public balance API —
   * the mock returns 99 999 so the rest of the pipeline works end-to-end.
   * Swap `fetchEsewaBalance` / `fetchKhaltiBalance` for real SDK calls
   * when you receive production credentials.
   */
  async getBalance(userId: string, provider: string): Promise<BalanceResult> {
    const p = provider.toUpperCase();

    try {
      if (p === 'ESEWA')  return await this.fetchEsewaBalance(userId);
      if (p === 'KHALTI') return await this.fetchKhaltiBalance(userId);
    } catch (err) {
      this.logger.warn(`[Balance] ${p} API error — falling back to mock: ${err.message}`);
    }

    // Safe fallback for sandbox / unknown providers
    return { provider: p, balance: 99_999, currency: 'NPR', fetchedAt: new Date(), isMock: true };
  }

  /** Returns true when balance >= required amount. */
  async hasSufficientBalance(userId: string, provider: string, amount: number): Promise<boolean> {
    const result = await this.getBalance(userId, provider);
    return result.balance >= amount;
  }

  // ─── Private: provider-specific calls ────────────────────────────────────

  private async fetchEsewaBalance(_userId: string): Promise<BalanceResult> {
    // TODO: replace with real eSewa merchant balance endpoint when available
    // e.g. GET https://uat.esewa.com.np/api/merchant/balance
    //      Headers: { Authorization: 'Bearer <token>' }
    const balance = 99_999; // mock
    this.logger.debug('[Balance] eSewa sandbox — using mock balance');
    return { provider: 'ESEWA', balance, currency: 'NPR', fetchedAt: new Date(), isMock: true };
  }

  private async fetchKhaltiBalance(_userId: string): Promise<BalanceResult> {
    // TODO: replace with Khalti merchant wallet endpoint when available
    const balance = 99_999; // mock
    this.logger.debug('[Balance] Khalti sandbox — using mock balance');
    return { provider: 'KHALTI', balance, currency: 'NPR', fetchedAt: new Date(), isMock: true };
  }
}
