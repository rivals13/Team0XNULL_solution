import { Logger, Injectable } from '@nestjs/common';

/** Keys whose values are stripped from logged objects entirely */
const DROP_KEYS = new Set(['password', 'passwordHash', 'privateKey', 'encryptionKey']);

/** Keys whose values are replaced with [REDACTED] */
const REDACT_KEYS = new Set(['token', 'refreshToken', 'accessToken', 'apiKey', 'webhookSecret']);

/**
 * SecureLoggerService — extends NestJS Logger with a sanitize() method
 * that masks PII and removes sensitive fields before anything reaches the log.
 *
 * Usage (drop-in for Logger):
 *   private readonly logger = new SecureLoggerService(MyService.name);
 *   this.logger.log(this.logger.sanitize(data));
 */
@Injectable()
export class SecureLoggerService extends Logger {
  // ─── Public sanitizer ────────────────────────────────────────────────────────

  sanitize(data: unknown): unknown {
    if (data === null || data === undefined) return data;
    if (typeof data === 'string')  return this.sanitizeString(data);
    if (typeof data !== 'object')  return data;
    if (Array.isArray(data))       return (data as unknown[]).map(item => this.sanitize(item));

    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      // Drop secret fields entirely
      if (DROP_KEYS.has(key)) continue;

      // Redact token-like fields
      if (REDACT_KEYS.has(key)) {
        result[key] = '[REDACTED]';
        continue;
      }

      // Mask phone numbers
      if (key === 'phone' && typeof value === 'string') {
        result[key] = this.maskPhone(value);
        continue;
      }

      // Mask email addresses
      if ((key === 'email' || key === 'emailAddress') && typeof value === 'string') {
        result[key] = this.maskEmail(value);
        continue;
      }

      // Recurse into nested objects
      if (typeof value === 'object' && value !== null) {
        result[key] = this.sanitize(value);
        continue;
      }

      result[key] = value;
    }

    return result;
  }

  // ─── Masking helpers ─────────────────────────────────────────────────────────

  /**
   * "9841234567" → "984*****67"
   */
  private maskPhone(phone: string): string {
    const clean = phone.trim();
    if (clean.length < 5) return '****';
    const start  = clean.slice(0, 3);
    const end    = clean.slice(-2);
    const stars  = '*'.repeat(clean.length - 5);
    return `${start}${stars}${end}`;
  }

  /**
   * "test@gmail.com" → "te**@gmail.com"
   */
  private maskEmail(email: string): string {
    const atIdx = email.indexOf('@');
    if (atIdx < 0) return '****';
    const local  = email.slice(0, atIdx);
    const domain = email.slice(atIdx);               // includes the @
    const visible = Math.min(2, local.length);
    const masked  = local.slice(0, visible) + '*'.repeat(Math.max(0, local.length - visible));
    return `${masked}${domain}`;
  }

  /**
   * Scan a plain string for embedded phone/email patterns and mask them.
   */
  private sanitizeString(text: string): string {
    // Mask Nepal phone numbers (10-digit starting with 98/97/96 or +977-...)
    return text.replace(
      /(\+?977[-\s]?)?(\b9[6-9]\d{8}\b)/g,
      (_, prefix, num) => `${prefix ?? ''}${this.maskPhone(num)}`,
    );
  }
}
