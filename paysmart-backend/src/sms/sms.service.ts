import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { SecureLoggerService } from '../common/logger/secure-logger.service';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface SmsSendResult {
  success: boolean;
  to: string;
  error?: string;
}

@Injectable()
export class SmsService {
  private readonly logger  = new SecureLoggerService(SmsService.name);
  private readonly baseUrl: string;
  private readonly token:   string;
  private readonly from:    string;
  private readonly testMode: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.baseUrl  = this.configService.get<string>('SPARROW_SMS_BASE_URL', 'https://api.sparrowsms.com/v2/sms');
    this.token    = this.configService.get<string>('SPARROW_SMS_TOKEN', '');
    this.from     = this.configService.get<string>('SPARROW_SMS_FROM', 'PaySmart');
    this.testMode = this.configService.get<string>('SMS_TEST_MODE', 'false') === 'true';
  }

  /**
   * Send a single SMS via Sparrow SMS.
   *
   * If SMS_TEST_MODE=true: prints to console, never calls Sparrow — zero cost.
   * If token is missing:   same mock behaviour with a warning.
   * Never throws — callers are never blocked by an SMS failure.
   */
  async send(to: string, text: string): Promise<SmsSendResult> {
    const phone = this.normalizePhone(to);

    // ── Test-mode: log only, no real SMS ──────────────────────────────────────
    if (this.testMode) {
      console.log(`[SMS MOCK] To: ${phone} Message: ${text}`);
      return { success: true, to: phone };
    }

    // ── Token missing: warn + log, no real SMS ────────────────────────────────
    if (!this.token) {
      this.logger.warn(`[SMS] SPARROW_SMS_TOKEN not set — skipping real SMS to ${phone}`);
      console.log(`[SMS MOCK] To: ${phone} Message: ${text}`);
      return { success: true, to: phone };
    }

    // ── Real Sparrow SMS API call ──────────────────────────────────────────────
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          this.baseUrl,
          { token: this.token, from: this.from, to: phone, text },
          { headers: { 'Content-Type': 'application/json' } },
        ),
      );

      this.logger.log(`[SMS] Sent to ${this.logger.sanitize(phone)} — response: ${JSON.stringify(response.data)}`);
      return { success: true, to: phone };
    } catch (error) {
      const msg = error?.response?.data ?? error?.message ?? 'Unknown error';
      this.logger.error(`[SMS] Failed to ${this.logger.sanitize(phone)}: ${JSON.stringify(msg)}`);
      return { success: false, to: phone, error: JSON.stringify(msg) };
    }
  }

  /**
   * Send the same message to multiple numbers at once.
   */
  async sendBulk(numbers: string[], text: string): Promise<SmsSendResult[]> {
    return Promise.all(numbers.map((n) => this.send(n, text)));
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  /**
   * Sparrow SMS accepts 10-digit Nepal numbers (e.g. 9801234567).
   * Strips leading +977 / 977 / 0 so callers don't have to worry.
   */
  private normalizePhone(phone: string): string {
    return phone.replace(/^\+?977/, '').replace(/^0/, '').trim();
  }
}
