import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';

/**
 * HmacService — HMAC-SHA256 request signing & verification.
 *
 * Uses HMAC_SECRET from env for global payload signing.
 * Also exposes signWithSecret / verifyWithSecret for per-app webhook secrets.
 */
@Injectable()
export class HmacService {
  private readonly logger = new Logger(HmacService.name);
  private readonly globalSecret: string;

  constructor(private readonly configService: ConfigService) {
    this.globalSecret = this.configService.get<string>('HMAC_SECRET', '');
    if (!this.globalSecret) {
      this.logger.warn('[HMAC] HMAC_SECRET is not set — global signing disabled');
    }
  }

  // ─── Global-secret methods (uses HMAC_SECRET from env) ───────────────────

  /**
   * Sign a payload object with the global HMAC_SECRET.
   * Returns hex digest of HMAC-SHA256(JSON.stringify(payload)).
   */
  sign(payload: object): string {
    return this.signWithSecret(JSON.stringify(payload), this.globalSecret || 'fallback');
  }

  /**
   * Verify a payload object against a signature using the global HMAC_SECRET.
   * Uses constant-time comparison to prevent timing attacks.
   */
  verify(payload: object, signature: string): boolean {
    const expected = this.sign(payload);
    return this.safeCompare(expected, signature);
  }

  // ─── Per-secret methods (used by webhook dispatcher) ─────────────────────

  /**
   * Sign a raw string body (or JSON-stringified object) with a given secret.
   * Used for per-app webhook signing where each app has its own webhookSecret.
   */
  signWithSecret(body: string, secret: string): string {
    return createHmac('sha256', secret).update(body).digest('hex');
  }

  /**
   * Verify a raw-body signature against a provided secret.
   * Uses constant-time comparison.
   */
  verifyWithSecret(body: string, signature: string, secret: string): boolean {
    const expected = this.signWithSecret(body, secret);
    return this.safeCompare(expected, signature);
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private safeCompare(a: string, b: string): boolean {
    try {
      const bufA = Buffer.from(a, 'hex');
      const bufB = Buffer.from(b, 'hex');
      if (bufA.length !== bufB.length) return false;
      return timingSafeEqual(bufA, bufB);
    } catch {
      return false;
    }
  }
}
