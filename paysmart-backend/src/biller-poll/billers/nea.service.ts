import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

export interface BillResult {
  found: boolean;
  amount?: number;
  dueDate?: Date;
  billingPeriod?: string;
  description?: string;
}

const MAX_RETRIES   = 3;
const RETRY_DELAY   = 5_000; // ms

/**
 * Calls the eSewa UAT biller API for Nepal Electricity Authority (NEA).
 * Endpoint: POST https://uat.esewa.com.np/api/biller/nea
 * Retries up to 3 times with 5 s delay before falling back to mock.
 */
@Injectable()
export class NeaService {
  private readonly logger = new Logger(NeaService.name);
  private readonly baseUrl: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.baseUrl = this.config.get<string>(
      'ESEWA_BASE_URL',
      'https://uat.esewa.com.np',
    );
  }

  async fetchBill(accountNumber: string): Promise<BillResult> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const url = `${this.baseUrl}/api/biller/nea`;
        const { data } = await firstValueFrom(
          this.http.post<any>(url, { accountNumber }, {
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
            timeout: 10_000,
          }),
        );

        // eSewa UAT response: { success: true, data: { amount, dueDate, billingPeriod, remarks } }
        if (!data?.success || !data?.data) {
          this.logger.debug(`[NEA] No bill for account ${accountNumber}`);
          return { found: false };
        }

        const bill = data.data;
        return {
          found:         true,
          amount:        Number(bill.amount ?? bill.totalAmount ?? 0),
          dueDate:       bill.dueDate ? new Date(bill.dueDate) : this.defaultDueDate(),
          billingPeriod: bill.billingPeriod ?? bill.month ?? this.currentPeriod(),
          description:   bill.remarks ?? `NEA electricity bill — ${accountNumber}`,
        };
      } catch (err) {
        lastError = err;
        this.logger.warn(
          `[NEA] Attempt ${attempt}/${MAX_RETRIES} failed for account ${accountNumber}: ${err?.message}`,
        );
        if (attempt < MAX_RETRIES) {
          await this.sleep(RETRY_DELAY);
        }
      }
    }

    // All retries exhausted → fall back to mock so poll cycle continues
    this.logger.error(
      `[NEA] All ${MAX_RETRIES} attempts failed for account ${accountNumber}. ` +
      `Last error: ${lastError?.message}. Using mock.`,
    );
    return this.mockBill(accountNumber);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ── Mock used in dev / when eSewa UAT is down ─────────────────────────────

  private mockBill(accountNumber: string): BillResult {
    // Only ~60 % of calls "find" a bill in mock mode so we can test both paths
    if (Math.random() < 0.4) return { found: false };

    const amount = Math.round((Math.random() * 2000 + 500) * 100) / 100;
    return {
      found:         true,
      amount,
      dueDate:       this.defaultDueDate(),
      billingPeriod: this.currentPeriod(),
      description:   `NEA electricity bill — ${accountNumber} (mock)`,
    };
  }

  private defaultDueDate(): Date {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d;
  }

  private currentPeriod(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }
}
