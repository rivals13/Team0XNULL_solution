import {
  Injectable, Logger, ConflictException, NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { MerchantCategory, BillStatus } from '@prisma/client';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../common/encryption/encryption.service';
import { CreateBillerAccountDto } from './dto/create-biller-account.dto';
import { BILL_DUE_QUEUE, BILL_DUE_NOTIFICATION_JOB } from '../queue/queue.constants';
import { BillDueJobData } from '../queue/processors/bill-due.processor';
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
    @InjectQueue(BILL_DUE_QUEUE)
    private readonly billDueQueue: Queue<BillDueJobData>,
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

    // ── Post-save: immediately check mock merchant, then queue 20-second WS event ──
    this.triggerBillCheck(userId, merchant.id, merchant.name, merchant.slug, dto.customerId, created.id)
      .catch(err => this.logger.warn(`[BillerAccounts] Post-save check failed: ${err?.message}`));

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
   * 1. Calls POST /mock-merchant/:slug/check-customer immediately after save.
   * 2. If hasDue: true → saves bill to DB (deduped) and queues a Bull job.
   * 3. Bull job fires after 20s → processor sends WebSocket BILL_DUE event
   *    with customerId included in the payload.
   *
   * TESTING:  20-second delay
   * PRODUCTION REPLACE WITH:
   *   7 days before due = first reminder
   *   3 days before due = second reminder
   *   1 day  before due = urgent reminder
   *   1 hour before due = final alert
   */
  private async triggerBillCheck(
    userId:       string,
    merchantId:   string,
    merchantName: string,
    merchantSlug: string,
    customerId:   string,
    billerAccountId: string,
  ) {
    // ── Step 1: call mock merchant ────────────────────────────────────────────
    let result: { found: boolean; hasDue?: boolean; amount?: number; dueDate?: string; description?: string };
    try {
      const { data: raw } = await axios.post(
        `${MOCK_BASE}/api/v1/mock-merchant/${merchantSlug}/check-customer`,
        { customerId },
        { timeout: 5000 },
      );
      // Unwrap global { success, data } envelope if present
      result = (raw && 'success' in raw && 'data' in raw) ? raw.data : raw;
    } catch (err: any) {
      this.logger.warn(`[BillerAccounts] Mock merchant check failed for ${merchantSlug}/${customerId}: ${err?.message}`);
      return;
    }

    this.logger.debug(`[BillerAccounts] Mock check ${merchantSlug}/${customerId} → found:${result?.found} hasDue:${result?.hasDue}`);

    if (!result?.found || !result?.hasDue) {
      this.logger.debug(`[BillerAccounts] No pending bill for ${merchantSlug}/${customerId} — skipping`);
      return;
    }

    // ── Step 2: save bill to DB (deduplication) ───────────────────────────────
    const amount  = result.amount ?? 0;
    const dueDate = result.dueDate ? new Date(result.dueDate) : new Date();
    const desc    = result.description ?? `${merchantName} bill due`;

    let billId: string;
    const existing = await this.prisma.bill.findFirst({
      where: { userId, merchantId, amount, dueDate, status: { not: BillStatus.CANCELLED } },
    });

    if (existing) {
      billId = existing.id;
      this.logger.debug(`[BillerAccounts] Bill already exists (${billId}) — reusing for queue job`);
    } else {
      const bill = await this.prisma.bill.create({
        data: { userId, merchantId, amount, dueDate, status: BillStatus.PENDING, description: desc },
      });
      billId = bill.id;
      this.logger.log(`[BillerAccounts] Bill ${billId} saved for user ${userId} — ${merchantName}`);
    }

    // ── Step 3: queue Bull job with 20-second delay ───────────────────────────
    const jobData: BillDueJobData = {
      userId,
      merchantName,
      merchantSlug,
      customerId,   // ← always included so frontend can pre-fill
      amount,
      dueDate:     dueDate.toISOString(),
      description: desc,
      billId,
    };

    await this.billDueQueue.add(BILL_DUE_NOTIFICATION_JOB, jobData, {
      delay:            20 * 1000,   // TESTING: 20 seconds — see comment above
      attempts:         3,
      backoff:          { type: 'exponential', delay: 5000 },
      removeOnComplete: 50,
      removeOnFail:     20,
    });

    this.logger.log(
      `[BillerAccounts] Bull job queued for ${merchantName}/${customerId} — fires in 20s`,
    );
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
