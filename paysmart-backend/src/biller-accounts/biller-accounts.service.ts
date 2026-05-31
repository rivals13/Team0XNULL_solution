import {
  Injectable, Logger, ConflictException, NotFoundException,
} from '@nestjs/common';
import { MerchantCategory } from '@prisma/client';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../common/encryption/encryption.service';
import { CreateBillerAccountDto } from './dto/create-biller-account.dto';
import { randomBytes } from 'crypto';

// Base URL for self-calls to the mock merchant API
const MOCK_BASE = process.env.APP_URL ?? 'http://localhost:3000';

/** Map a UI-side category string to a valid Prisma MerchantCategory enum. */
function toMerchantCategory(raw: string): MerchantCategory {
  const key = raw.toUpperCase();
  switch (key) {
    case 'ELECTRICITY':   return MerchantCategory.ELECTRICITY;
    case 'WATER':         return MerchantCategory.WATER;
    case 'UTILITY':       return MerchantCategory.UTILITY;
    case 'TV':
    case 'CABLE':         return MerchantCategory.TV;
    case 'TRAFFIC':       return MerchantCategory.TRAFFIC;
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
    private readonly enc:    EncryptionService,
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

    // ── Post-save: notify merchant of SAVED action → merchant pushes bill in ~20s ──
    // Skip for manual categories (rent, other/P2P) and KUKL water (no live merchant API)
    const SKIP_MERCHANT_NOTIFY = new Set(['house-rent', 'other-payment', 'kukl-water']);
    if (!SKIP_MERCHANT_NOTIFY.has(merchant.slug)) {
      this.notifyMerchantAction(merchant.slug, dto.customerId, 'SAVED')
        .catch(err => this.logger.warn(`[BillerAccounts] Post-save merchant notify failed: ${err?.message}`));
    }

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

  /**
   * Notifies the mock merchant of a customer action (SAVED / PAY_NOW / SCHEDULED).
   * The merchant then triggers a bill push back to PaySmart after a short delay.
   *
   * TESTING delays (set in mock merchant controller):
   *   SAVED     → 20 seconds
   *   PAY_NOW   → 5 seconds
   *   SCHEDULED → 10 seconds
   * PRODUCTION REPLACE WITH:
   *   7 days before due = first reminder
   *   3 days before due = second reminder
   *   1 day  before due = urgent reminder
   *   1 hour before due = final alert
   */
  /**
   * Notifies the mock merchant of a customer action.
   * The merchant will then push the bill back via triggerBillForCustomer.
   * Action: 'SAVED' | 'PAY_NOW' | 'SCHEDULED'
   */
  async notifyMerchantAction(
    merchantSlug: string,
    customerId:   string,
    action:       'SAVED' | 'PAY_NOW' | 'SCHEDULED',
    amount?:      number,
    scheduledDate?: string,
  ) {
    try {
      const { data: raw } = await axios.post(
        `${MOCK_BASE}/api/v1/mock-merchant/${merchantSlug}/customer-action`,
        { customerId, action, amount, scheduledDate },
        { timeout: 5000 },
      );
      const result = (raw && 'data' in raw) ? raw.data : raw;
      this.logger.log(
        `[MerchantNotify] ${merchantSlug}/${customerId} → ${action} | hasDue:${result?.hasDue}`,
      );
    } catch (err: any) {
      this.logger.warn(`[MerchantNotify] Failed for ${merchantSlug}/${customerId}: ${err?.message}`);
    }
  }

  /** Update the internet package stored in a biller account's encrypted details. */
  async updatePackage(userId: string, id: string, pkg: string, price: number) {
    const acc = await this.prisma.billerAccount.findFirst({ where: { id, userId } });
    if (!acc) throw new NotFoundException('Biller account not found');

    // Decrypt existing details, merge, re-encrypt
    const existing = this.decryptDetails(acc.accountName);
    const updated  = { ...existing, package: pkg, packagePrice: price };
    const encrypted = this.enc.encrypt(JSON.stringify(updated));

    await this.prisma.billerAccount.update({
      where: { id },
      data:  { accountName: encrypted },
    });
    this.logger.log(`Biller account ${id}: package updated to ${pkg} (NPR ${price}/mo)`);
    return { success: true, package: pkg, packagePrice: price };
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
