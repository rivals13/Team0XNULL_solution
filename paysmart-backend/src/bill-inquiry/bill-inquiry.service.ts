import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import axios from 'axios';
import { BillStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../common/encryption/encryption.service';
import { NotificationsService } from '../notifications/notifications.service';

export interface BillInquiryResult {
  amount: number;
  dueDate: string;
  description: string;
  invoiceNumber?: string;
  studentName?: string;
  meterReading?: string;
  chitNumber?: string;
  violation?: string;
  billId?: string; // DB bill id if saved
}

@Injectable()
export class BillInquiryService {
  private readonly logger = new Logger(BillInquiryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Fetches bill from merchant's billInquiryUrl for a given customerId.
   * If userId is provided, saves the bill to DB and notifies the user.
   */
  async inquireBill(
    merchantSlug: string,
    customerId: string,
    userId?: string,
  ): Promise<BillInquiryResult | null> {
    // 1. Find merchant by slug
    const merchant = await this.prisma.merchant.findUnique({
      where: { slug: merchantSlug },
    });

    if (!merchant) {
      throw new NotFoundException(`Merchant with slug "${merchantSlug}" not found.`);
    }

    // 2. If no billInquiryUrl → return null
    if (!merchant.billInquiryUrl) {
      this.logger.debug(`[BillInquiry] Merchant "${merchantSlug}" has no billInquiryUrl — skipping`);
      return null;
    }

    // 3. Decrypt billInquiryApiKey (if present)
    let apiKey: string | null = null;
    if (merchant.billInquiryApiKey) {
      try {
        apiKey = this.encryption.decrypt(merchant.billInquiryApiKey);
      } catch {
        this.logger.warn(`[BillInquiry] Failed to decrypt API key for merchant "${merchantSlug}"`);
      }
    }

    // 4. Call the merchant's bill inquiry endpoint
    let rawResponse: any;
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (apiKey) {
        headers['X-API-Key'] = apiKey;
      }

      const url = `${merchant.billInquiryUrl}?customerId=${encodeURIComponent(customerId)}`;
      const response = await axios.get(url, { headers, timeout: 8000 });
      // Some backends (incl. our own) wrap responses in { success, data, timestamp }.
      // Unwrap if present so the rest of the code always sees the raw bill object.
      const body = response.data;
      rawResponse = (body && typeof body === 'object' && 'data' in body && body.success === true)
        ? body.data
        : body;
    } catch (err) {
      this.logger.error(
        `[BillInquiry] HTTP call failed for "${merchantSlug}" (customerId: ${customerId}): ${err?.message}`,
      );
      return null;
    }

    // 5. Validate response — handle all response shapes
    if (!rawResponse) {
      this.logger.warn(`[BillInquiry] Empty response from "${merchantSlug}"`);
      return null;
    }
    // Customer not registered with merchant
    if (rawResponse.found === false || rawResponse.error === 'CUSTOMER_NOT_FOUND') {
      this.logger.debug(`[BillInquiry] Customer "${customerId}" not found at "${merchantSlug}"`);
      return null;
    }
    // Customer found but no pending bill (e.g. Vianet/CGNet with hasDue:false)
    if (rawResponse.found === true && rawResponse.hasDue === false) {
      this.logger.debug(`[BillInquiry] Customer "${customerId}" at "${merchantSlug}" has no pending bill`);
      // Return a sentinel so callers can distinguish NO_DUE from CUSTOMER_NOT_FOUND
      return { __noDue: true } as any;
    }
    if (typeof rawResponse.amount !== 'number' || !rawResponse.dueDate) {
      this.logger.warn(`[BillInquiry] Invalid response from "${merchantSlug}": missing amount or dueDate`);
      return null;
    }

    const result: BillInquiryResult = {
      amount:        rawResponse.amount,
      dueDate:       rawResponse.dueDate,
      description:   rawResponse.description ?? `Bill from ${merchant.name}`,
      invoiceNumber: rawResponse.invoiceNumber,
      studentName:   rawResponse.studentName,
      meterReading:  rawResponse.meterReading,
      chitNumber:    rawResponse.chitNumber,
      violation:     rawResponse.violation,
    };

    // 6. If userId provided: deduplicate + save to DB + notify
    if (userId) {
      const dueDate = new Date(result.dueDate);
      if (!isNaN(dueDate.getTime())) {
        try {
          // Check if a bill already exists for this merchant + dueDate + amount
          const existing = await this.prisma.bill.findFirst({
            where: {
              userId,
              merchantId: merchant.id,
              amount:     result.amount,
              dueDate:    dueDate,
              status:     { not: BillStatus.CANCELLED },
            },
          });

          if (!existing) {
            const bill = await this.prisma.bill.create({
              data: {
                userId,
                merchantId:  merchant.id,
                amount:      result.amount,
                dueDate,
                status:      BillStatus.PENDING,
                description: result.description,
              },
            });

            result.billId = bill.id;

            // Send WebSocket + FCM notification
            const daysUntil = Math.ceil((dueDate.getTime() - Date.now()) / 86_400_000);
            const dueLine = daysUntil <= 0
              ? 'due today'
              : `due in ${daysUntil} day${daysUntil > 1 ? 's' : ''}`;

            this.notifications.sendNotification(
              userId,
              'BILL_DUE',
              `New bill from ${merchant.name}`,
              `NPR ${result.amount.toFixed(2)} ${dueLine}. ${result.description}`.trim(),
              {
                billId:       bill.id,
                merchantId:   merchant.id,
                merchantSlug: merchant.slug,
                merchantName: merchant.name,
                amount:       result.amount,
                dueDate:      dueDate.toISOString(),
                description:  result.description,
              },
            ).catch(notifyErr =>
              this.logger.warn(`[BillInquiry] Notification failed for user ${userId}: ${notifyErr?.message}`),
            );

            this.logger.log(
              `[BillInquiry] New bill ${bill.id} saved for user ${userId} from merchant ${merchantSlug}`,
            );
          } else {
            // Bill already exists — just attach its id, no notification
            // (popup only fires from explicit actions: save/pay/schedule → merchant trigger)
            result.billId = existing.id;
            this.logger.debug(
              `[BillInquiry] Bill already exists (id: ${existing.id}) for user ${userId} — skipping notification`,
            );
          }
        } catch (dbErr) {
          this.logger.error(
            `[BillInquiry] DB error saving bill for user ${userId}: ${dbErr?.message}`,
          );
        }
      }
    }

    return result;
  }

  /**
   * Check bill for a specific biller account belonging to a user.
   * Used by the manual check-bill endpoint and the hourly cron.
   *
   * Returns:
   *  - BillInquiryResult          → bill found (customer exists, bill data attached)
   *  - { noBill: true, reason: 'NO_INQUIRY_URL' }       → merchant has no billInquiryUrl
   *  - { noBill: true, reason: 'CUSTOMER_NOT_FOUND' }   → customerId not in merchant DB
   */
  async checkBillForAccount(
    accountId: string,
    userId: string,
  ): Promise<BillInquiryResult | { noBill: true; reason: string }> {
    // Find the biller account and verify it belongs to the user
    const account = await this.prisma.billerAccount.findFirst({
      where: { id: accountId, userId },
      include: { merchant: { select: { id: true, name: true, slug: true, billInquiryUrl: true } } },
    });

    if (!account) {
      throw new NotFoundException('Biller account not found or access denied.');
    }

    // Merchant has no billInquiryUrl — nothing to check (rent, insurance, custom, etc.)
    if (!account.merchant.billInquiryUrl) {
      return { noBill: true, reason: 'NO_INQUIRY_URL' };
    }

    const result = await this.inquireBill(
      account.merchant.slug,
      account.accountNumber,
      userId,
    );

    if (!result)                      return { noBill: true, reason: 'CUSTOMER_NOT_FOUND' };
    if ((result as any).__noDue)      return { noBill: true, reason: 'NO_DUE' };
    return result;
  }

  /**
   * Called by the mock merchant after receiving a customer action.
   * Looks up the biller account by slug + customerId, then triggers
   * the full bill inquiry → save → WebSocket notification flow.
   *
   * This simulates the MERCHANT pushing a bill back to PaySmart.
   */
  /**
   * Called by the mock merchant after receiving a customer action.
   * Calls the mock merchant directly (bypasses billInquiryUrl requirement so
   * auto-created merchants without a seeded URL still work).
   * Saves bill + sends WebSocket BILL_DUE notification to the user.
   */
  async triggerBillForCustomer(merchantSlug: string, customerId: string): Promise<void> {
    // Find biller accounts for this merchant + customer
    const accounts = await this.prisma.billerAccount.findMany({
      where: { accountNumber: customerId, merchant: { slug: merchantSlug } },
      include: { merchant: { select: { id: true, name: true, slug: true } } },
    });

    if (accounts.length === 0) {
      this.logger.debug(`[BillTrigger] No biller account found for ${merchantSlug}/${customerId}`);
      return;
    }

    // Call mock merchant directly — no billInquiryUrl needed
    const MOCK_BASE = process.env.APP_URL ?? 'http://localhost:3000';
    let billData: { found: boolean; hasDue?: boolean; amount?: number; dueDate?: string; description?: string } | null = null;

    try {
      const { data: raw } = await require('axios').post(
        `${MOCK_BASE}/api/v1/mock-merchant/${merchantSlug}/check-customer`,
        { customerId },
        { timeout: 5000 },
      );
      const unwrapped = (raw && 'success' in raw && 'data' in raw) ? raw.data : raw;
      if (unwrapped?.found && unwrapped?.hasDue !== false && typeof unwrapped?.amount === 'number') {
        billData = unwrapped;
      }
    } catch (err: any) {
      this.logger.warn(`[BillTrigger] Mock merchant call failed: ${err?.message}`);
      return;
    }

    if (!billData) {
      this.logger.debug(`[BillTrigger] No due bill for ${merchantSlug}/${customerId}`);
      return;
    }

    const amount      = billData.amount!;
    const dueDate     = new Date(billData.dueDate ?? Date.now() + 15 * 24 * 60 * 60 * 1000);
    const description = billData.description ?? `${merchantSlug} bill due`;

    // For each matching account, save bill + send WS notification
    await Promise.allSettled(
      accounts.map(async acc => {
        try {
          // Dedup: only create bill if not already exists
          const existing = await this.prisma.bill.findFirst({
            where: { userId: acc.userId, merchantId: acc.merchant.id, amount, dueDate, status: { not: 'CANCELLED' as any } },
          });

          const billId = existing
            ? existing.id
            : (await this.prisma.bill.create({
                data: { userId: acc.userId, merchantId: acc.merchant.id, amount, dueDate, status: 'PENDING' as any, description },
              })).id;

          const daysUntil = Math.ceil((dueDate.getTime() - Date.now()) / 86_400_000);
          const dueLine   = daysUntil <= 0 ? 'due today' : `due in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`;

          await this.notifications.sendNotification(
            acc.userId,
            'BILL_DUE',
            `Bill from ${acc.merchant.name}`,
            `NPR ${amount.toFixed(0)} ${dueLine}. ${description}`.trim(),
            {
              billId,
              merchantId:   acc.merchant.id,
              merchantSlug: acc.merchant.slug,
              merchantName: acc.merchant.name,
              customerId,
              amount,
              dueDate:     dueDate.toISOString(),
              description,
            },
          );

          this.logger.log(`[BillTrigger] ✅ Bill + notification sent for user ${acc.userId} | ${merchantSlug}/${customerId} | NPR ${amount}`);
        } catch (err: any) {
          this.logger.warn(`[BillTrigger] Failed for ${acc.id}: ${err?.message}`);
        }
      }),
    );
  }
}
