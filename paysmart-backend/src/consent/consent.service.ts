import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const CONSENT_TTL_DAYS = 90;

@Injectable()
export class ConsentService {
  private readonly logger = new Logger(ConsentService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Core consent API ─────────────────────────────────────────────────────

  /**
   * Returns true if the user has active, non-expired consent.
   */
  async checkConsent(userId: string): Promise<boolean> {
    const consent = await this.prisma.esewaUserConsent.findFirst({
      where: { userId, isActive: true, revokedAt: null },
    });
    if (!consent) return false;
    return consent.expiresAt > new Date();
  }

  /**
   * Grant (or renew) consent for a set of data types.
   * Sets a new 90-day expiry from now.
   */
  async grantConsent(
    userId: string,
    dataTypes: string[],
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + CONSENT_TTL_DAYS * 24 * 60 * 60 * 1000);

    // Revoke any existing consent first (upsert via userId unique constraint)
    await this.prisma.esewaUserConsent.upsert({
      where: { userId },
      update: {
        dataTypes,
        grantedAt: now,
        expiresAt,
        revokedAt: null,
        isActive: true,
        ipAddress: ipAddress ? this.maskIp(ipAddress) : null,
        userAgent: userAgent ?? null,
      },
      create: {
        userId,
        dataTypes,
        grantedAt: now,
        expiresAt,
        isActive: true,
        ipAddress: ipAddress ? this.maskIp(ipAddress) : null,
        userAgent: userAgent ?? null,
      },
    });

    this.logger.log(`[Consent] Granted for user ${userId} — expires ${expiresAt.toISOString()}`);
  }

  /**
   * Revoke consent immediately. All eSewa data access is blocked after this.
   */
  async revokeConsent(userId: string): Promise<void> {
    const existing = await this.prisma.esewaUserConsent.findFirst({
      where: { userId },
    });

    if (!existing) {
      this.logger.warn(`[Consent] Revoke called for user ${userId} with no existing consent`);
      return;
    }

    await this.prisma.esewaUserConsent.update({
      where: { userId },
      data: { isActive: false, revokedAt: new Date() },
    });

    this.logger.log(`[Consent] Revoked for user ${userId}`);
  }

  /**
   * Returns true if consent exists but has expired (not revoked, just expired).
   */
  async isConsentExpired(userId: string): Promise<boolean> {
    const consent = await this.prisma.esewaUserConsent.findFirst({
      where: { userId, isActive: true, revokedAt: null },
    });
    if (!consent) return false;
    return consent.expiresAt <= new Date();
  }

  /**
   * Return full consent record for a user, or null.
   */
  async getConsent(userId: string) {
    return this.prisma.esewaUserConsent.findFirst({
      where: { userId },
    });
  }

  /**
   * Guard: throws ForbiddenException if consent is missing or expired.
   * Call this at the start of any eSewa data-access operation.
   */
  async requireConsent(userId: string): Promise<void> {
    const hasConsent = await this.checkConsent(userId);
    if (!hasConsent) {
      const expired = await this.isConsentExpired(userId);
      if (expired) {
        throw new ForbiddenException(
          'Your eSewa data-sharing consent has expired. Please renew your consent.',
        );
      }
      throw new ForbiddenException(
        'eSewa data access requires your explicit consent. Please grant consent first.',
      );
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  /** Mask the last octet of an IPv4 address: 192.168.1.55 → 192.168.1.0 */
  maskIp(ip: string): string {
    const parts = ip.split('.');
    if (parts.length === 4) {
      parts[3] = '0';
      return parts.join('.');
    }
    // IPv6 or unexpected format — store as-is but truncated
    return ip.substring(0, 20);
  }
}
