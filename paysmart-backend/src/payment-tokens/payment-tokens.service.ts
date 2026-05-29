import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { TokenType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../common/encryption/encryption.service';

@Injectable()
export class PaymentTokensService {
  private readonly logger = new Logger(PaymentTokensService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly enc: EncryptionService,
  ) {}

  /**
   * Store a new payment provider session token (encrypted).
   * Deactivates any previous active token of the same type for this user.
   * NEVER pass raw passwords, MPINs, or OTPs here — only session/bearer tokens.
   */
  async storeToken(
    userId: string,
    tokenType: TokenType,
    rawToken: string,
    expiresAt: Date,
  ) {
    // Deactivate previous tokens of this type
    await this.prisma.paymentToken.updateMany({
      where: { userId, tokenType, isActive: true },
      data: { isActive: false },
    });

    const encryptedToken = this.enc.encrypt(rawToken);

    const record = await this.prisma.paymentToken.create({
      data: {
        userId,
        tokenType,
        token: encryptedToken,
        expiresAt,
        isActive: true,
      },
    });

    this.logger.log(`[PaymentToken] Stored ${tokenType} token for user ${userId}`);
    return record;
  }

  /**
   * Retrieve and decrypt an active, non-expired token.
   * Throws UnauthorizedException if no valid token exists.
   */
  async getActiveToken(userId: string, tokenType: TokenType): Promise<string> {
    const record = await this.prisma.paymentToken.findFirst({
      where: {
        userId,
        tokenType,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) {
      throw new UnauthorizedException(
        `No active ${tokenType} token. Please re-authenticate with the payment provider.`,
      );
    }

    return this.enc.decrypt(record.token);
  }

  /**
   * Check if a user has a valid active token without exposing it.
   */
  async hasActiveToken(userId: string, tokenType: TokenType): Promise<boolean> {
    const count = await this.prisma.paymentToken.count({
      where: {
        userId,
        tokenType,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
    });
    return count > 0;
  }

  /**
   * Revoke all active tokens for a user (e.g. on logout or security event).
   */
  async revokeAllTokens(userId: string): Promise<void> {
    await this.prisma.paymentToken.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false },
    });
    this.logger.log(`[PaymentToken] All tokens revoked for user ${userId}`);
  }

  /**
   * Revoke tokens of a specific type.
   */
  async revokeToken(userId: string, tokenType: TokenType): Promise<void> {
    await this.prisma.paymentToken.updateMany({
      where: { userId, tokenType, isActive: true },
      data: { isActive: false },
    });
  }
}
