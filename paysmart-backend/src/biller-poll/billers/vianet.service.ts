import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { BillResult } from './nea.service';

const MAX_RETRIES = 3;
const RETRY_DELAY = 5_000; // ms

/**
 * Fetches Vianet internet bills by customer ID.
 * Endpoint: GET https://selfcare.vianet.com.np/api/v1/bill?customerId=<id>
 * Retries up to 3 times with 5 s delay before falling back to mock.
 */
@Injectable()
export class VianetService {
  private readonly logger = new Logger(VianetService.name);
  private readonly baseUrl: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.baseUrl = this.config.get<string>(
      'VIANET_BASE_URL',
      'https://selfcare.vianet.com.np',
    );
  }

  async fetchBill(customerId: string): Promise<BillResult> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const url = `${this.baseUrl}/api/v1/bill`;
        const { data } = await firstValueFrom(
          this.http.get<any>(url, {
            params:  { customerId },
            headers: { Accept: 'application/json' },
            timeout: 10_000,
          }),
        );

        // Expected: { status: 'success', bill: { amount, dueDate, billingPeriod, remarks } }
        if (data?.status !== 'success' || !data?.bill) {
          this.logger.debug(`[Vianet] No bill for customer ${customerId}`);
          return { found: false };
        }

        const bill = data.bill;
        return {
          found:         true,
          amount:        Number(bill.amount ?? bill.totalDue ?? 0),
          dueDate:       bill.dueDate ? new Date(bill.dueDate) : this.defaultDueDate(),
          billingPeriod: bill.billingPeriod ?? bill.month ?? this.currentPeriod(),
          description:   bill.remarks ?? `Vianet internet bill — customer ${customerId}`,
        };
      } catch (err) {
        lastError = err;
        this.logger.warn(
          `[Vianet] Attempt ${attempt}/${MAX_RETRIES} failed for customer ${customerId}: ${err?.message}`,
        );
        if (attempt < MAX_RETRIES) {
          await this.sleep(RETRY_DELAY);
        }
      }
    }

    this.logger.error(
      `[Vianet] All ${MAX_RETRIES} attempts failed for customer ${customerId}. ` +
      `Last error: ${lastError?.message}. Using mock.`,
    );
    return this.mockBill(customerId);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ── Mock ──────────────────────────────────────────────────────────────────

  private mockBill(customerId: string): BillResult {
    if (Math.random() < 0.4) return { found: false };

    const amount = Math.round((Math.random() * 1500 + 700) * 100) / 100;
    return {
      found:         true,
      amount,
      dueDate:       this.defaultDueDate(),
      billingPeriod: this.currentPeriod(),
      description:   `Vianet internet bill — customer ${customerId} (mock)`,
    };
  }

  private defaultDueDate(): Date {
    const d = new Date();
    d.setDate(d.getDate() + 10);
    return d;
  }

  private currentPeriod(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }
}
