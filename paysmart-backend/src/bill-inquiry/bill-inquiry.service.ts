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
      rawResponse = response.data;
    } catch (err) {
      this.logger.error(
        `[BillInquiry] HTTP call failed for "${merchantSlug}" (customerId: ${customerId}): ${err?.message}`,
      );
      return null;
    }

    // 5. Validate response has amount + dueDate
    if (!rawResponse || typeof rawResponse.amount !== 'number' || !rawResponse.dueDate) {
      this.logger.warn(
        `[BillInquiry] Invalid response from "${merchantSlug}": missing amount or dueDate`,
      );
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
                billId:      bill.id,
                merchantId:  merchant.id,
                merchantName: merchant.name,
                amount:      result.amount,
                dueDate:     dueDate.toISOString(),
              },
            ).catch(notifyErr =>
              this.logger.warn(`[BillInquiry] Notification failed for user ${userId}: ${notifyErr?.message}`),
            );

            this.logger.log(
              `[BillInquiry] New bill ${bill.id} saved for user ${userId} from merchant ${merchantSlug}`,
            );
          } else {
            result.billId = existing.id;
            this.logger.debug(
              `[BillInquiry] Bill already exists (id: ${existing.id}) for user ${userId} — skipping insert`,
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
   */
  async checkBillForAccount(
    accountId: string,
    userId: string,
  ): Promise<BillInquiryResult | { noBill: true }> {
    // Find the biller account and verify it belongs to the user
    const account = await this.prisma.billerAccount.findFirst({
      where: { id: accountId, userId },
      include: { merchant: { select: { id: true, name: true, slug: true, billInquiryUrl: true } } },
    });

    if (!account) {
      throw new NotFoundException('Biller account not found or access denied.');
    }

    const result = await this.inquireBill(
      account.merchant.slug,
      account.accountNumber,
      userId,
    );

    if (!result) {
      return { noBill: true };
    }

    return result;
  }
}
