import {
  Injectable, Logger, ConflictException, NotFoundException,
} from '@nestjs/common';
import { MerchantCategory } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../common/encryption/encryption.service';
import { CreateBillerAccountDto } from './dto/create-biller-account.dto';
import { randomBytes } from 'crypto';

/** Map a UI-side category string to a valid Prisma MerchantCategory enum. */
function toMerchantCategory(raw: string): MerchantCategory {
  const key = raw.toUpperCase();
  switch (key) {
    case 'ELECTRICITY':
    case 'WATER':
    case 'UTILITY':       return MerchantCategory.UTILITY;
    case 'TRAFFIC':
    case 'GOVERNMENT':    return MerchantCategory.GOVERNMENT;
    case 'EDUCATION':
    case 'SCHOOL':
    case 'COLLEGE':       return MerchantCategory.EDUCATION;
    case 'INTERNET':      return MerchantCategory.INTERNET;
    case 'TELECOM':       return MerchantCategory.TELECOM;
    default:              return MerchantCategory.OTHER;
  }
}

/**
 * Manages user-owned biller accounts (NEA SC No., KUKL client code, school student ID,
 * traffic chit number, etc.). On create, the Merchant row is upserted by slug.
 *
 * Provider-specific `details` (officeCode, fiscalYear, etc.) are JSON-encoded
 * into the `accountName` column, then AES-256-GCM encrypted before storage.
 */
@Injectable()
export class BillerAccountsService {
  private readonly logger = new Logger(BillerAccountsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly enc: EncryptionService,
  ) {}

  /** List all biller accounts for the logged-in user with merchant info + decrypted details. */
  async list(userId: string) {
    const accounts = await this.prisma.billerAccount.findMany({
      where: { userId },
      include: { merchant: { select: { id: true, name: true, slug: true, category: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return accounts.map(a => ({
      id:             a.id,
      billerName:     a.nickname ?? a.merchant.name,
      billerSlug:     a.merchant.slug,
      billerCategory: a.merchant.category,
      customerId:     a.accountNumber,
      details:        this.decryptDetails(a.accountName),
      isDefault:      a.isDefault,
      isVerified:     a.isVerified,
      createdAt:      a.createdAt,
      merchant:       a.merchant,
    }));
  }

  /** Create a new biller account; upserts the Merchant row if needed. */
  async create(userId: string, dto: CreateBillerAccountDto) {
    const slug = dto.billerSlug.toLowerCase().trim();

    // Upsert the merchant — works whether or not it already exists
    const merchant = await this.prisma.merchant.upsert({
      where:  { slug },
      update: { /* keep existing data */ },
      create: {
        slug,
        name:     dto.billerName,
        category: toMerchantCategory(dto.billerCategory),
        apiKey:   `auto_${randomBytes(16).toString('hex')}`,
        isActive: true,
      },
    });

    // Reject duplicate accountNumber for the same user+merchant
    const exists = await this.prisma.billerAccount.findUnique({
      where: {
        userId_merchantId_accountNumber: {
          userId,
          merchantId: merchant.id,
          accountNumber: dto.customerId,
        },
      },
    });
    if (exists) {
      throw new ConflictException(`This ${dto.billerName} account is already saved.`);
    }

    // Encrypt the details JSON before persisting
    const rawDetails    = dto.details ? JSON.stringify(dto.details) : null;
    const encryptedName = rawDetails ? this.enc.encrypt(rawDetails) : null;

    const created = await this.prisma.billerAccount.create({
      data: {
        userId,
        merchantId:    merchant.id,
        accountNumber: dto.customerId,          // not encrypted — used as unique key
        accountName:   encryptedName,           // encrypted JSON details
        nickname:      dto.nickname ?? dto.billerName,
        isDefault:     dto.isDefault ?? false,
        isVerified:    true,
      },
      include: { merchant: true },
    });

    this.logger.log(`Biller account created: ${merchant.slug} / ${dto.customerId} for user ${userId}`);

    return {
      id:             created.id,
      billerName:     created.nickname ?? merchant.name,
      billerSlug:     merchant.slug,
      billerCategory: merchant.category,
      customerId:     created.accountNumber,
      details:        dto.details ?? {},        // return original (plaintext) to caller
      isDefault:      created.isDefault,
      isVerified:     created.isVerified,
      createdAt:      created.createdAt,
      merchant: { id: merchant.id, name: merchant.name, slug: merchant.slug, category: merchant.category },
    };
  }

  async remove(userId: string, id: string) {
    const acc = await this.prisma.billerAccount.findFirst({ where: { id, userId } });
    if (!acc) throw new NotFoundException('Biller account not found');
    await this.prisma.billerAccount.delete({ where: { id } });
    return { success: true };
  }

  // ─── Private helpers ──────────────────────────────────────────────────────────

  /**
   * Decrypt and parse the accountName column (which stores encrypted JSON details).
   * Backwards-compatible: plain JSON strings are parsed directly.
   */
  private decryptDetails(raw: string | null): Record<string, unknown> {
    if (!raw) return {};
    try {
      const decrypted = this.enc.decrypt(raw); // no-op if not encrypted
      return JSON.parse(decrypted);
    } catch {
      return {};
    }
  }
}
