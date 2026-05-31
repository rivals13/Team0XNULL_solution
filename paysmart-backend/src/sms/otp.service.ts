import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SmsService } from './sms.service';
import { SmsTemplates } from './sms.templates';

interface OtpRecord {
  code: string;
  expiresAt: Date;
  attempts: number;
}

const MAX_ATTEMPTS = 3;

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private readonly store = new Map<string, OtpRecord>(); // phone → OtpRecord
  private readonly expiresMinutes: number;
  private readonly otpLength: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly smsService: SmsService,
  ) {
    this.expiresMinutes = this.configService.get<number>('OTP_EXPIRES_MINUTES', 5);
    this.otpLength      = this.configService.get<number>('OTP_LENGTH', 6);
  }

  /**
   * Generate a fresh OTP, store it, and fire the SMS.
   * Re-calling this before expiry overwrites the old OTP.
   */
  async sendOtp(phone: string): Promise<{ message: string }> {
    const code = this.generateCode();
    const expiresAt = new Date(Date.now() + this.expiresMinutes * 60 * 1000);

    this.store.set(phone, { code, expiresAt, attempts: 0 });
    this.scheduleCleanup(phone, this.expiresMinutes * 60 * 1000);

    this.logger.log(`[OTP] Generated for ${phone}, expires at ${expiresAt.toISOString()}`);
    await this.smsService.send(phone, SmsTemplates.otp(code, this.expiresMinutes));

    return { message: `OTP sent to ${phone}. Valid for ${this.expiresMinutes} minutes.` };
  }

  /**
   * Verify the OTP supplied by the user.
   * Returns true on success, throws on failure.
   */
  verifyOtp(phone: string, code: string): boolean {
    const record = this.store.get(phone);

    if (!record) {
      throw new BadRequestException('No OTP found for this number. Please request a new one.');
    }

    if (new Date() > record.expiresAt) {
      this.store.delete(phone);
      throw new BadRequestException('OTP has expired. Please request a new one.');
    }

    record.attempts += 1;

    if (record.attempts > MAX_ATTEMPTS) {
      this.store.delete(phone);
      throw new BadRequestException('Too many failed attempts. Please request a new OTP.');
    }

    if (record.code !== code) {
      throw new BadRequestException(`Invalid OTP. ${MAX_ATTEMPTS - record.attempts} attempts remaining.`);
    }

    // Correct — remove from store so it can't be reused
    this.store.delete(phone);
    this.logger.log(`[OTP] Verified successfully for ${phone}`);
    return true;
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private generateCode(): string {
    const max = Math.pow(10, this.otpLength);
    const min = Math.pow(10, this.otpLength - 1);
    return String(Math.floor(Math.random() * (max - min) + min));
  }

  private scheduleCleanup(phone: string, delayMs: number) {
    setTimeout(() => this.store.delete(phone), delayMs);
  }
}
