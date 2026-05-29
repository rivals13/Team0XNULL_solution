import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { TransactionStatus } from '@prisma/client';

export interface EsewaStatusResponse {
  product_code: string;
  transaction_uuid: string;
  total_amount: number;
  status: 'COMPLETE' | 'PENDING' | 'FULL_REFUND' | 'PARTIAL_REFUND' | 'AMBIGUOUS' | 'NOT_FOUND' | 'CANCELLED';
  ref_id?: string;
}

export interface VerifiedTransaction {
  externalId: string;
  amount: number;
  newStatus: TransactionStatus;
  rawResponse: EsewaStatusResponse | null;
}

@Injectable()
export class EsewaSyncService {
  private readonly logger = new Logger(EsewaSyncService.name);
  private readonly baseUrl: string;
  private readonly merchantId: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl    = this.configService.get<string>('ESEWA_BASE_URL', 'https://uat.esewa.com.np');
    this.merchantId = this.configService.get<string>('ESEWA_MERCHANT_ID', 'EPAYTEST');
  }

  /**
   * Verify a single transaction against eSewa sandbox.
   * Returns the mapped TransactionStatus — never throws.
   */
  async verifyOne(externalId: string, amount: number): Promise<VerifiedTransaction> {
    try {
      const url =
        `${this.baseUrl}/api/epay/transaction/status/` +
        `?product_code=${this.merchantId}` +
        `&total_amount=${amount}` +
        `&transaction_uuid=${externalId}`;

      const { data } = await firstValueFrom(
        this.httpService.get<EsewaStatusResponse>(url, { timeout: 8000 }),
      );

      this.logger.debug(`[eSewa verify] ${externalId} → ${data.status}`);

      return {
        externalId,
        amount,
        newStatus: this.mapStatus(data.status),
        rawResponse: data,
      };
    } catch (error) {
      this.logger.warn(`[eSewa verify] Failed for ${externalId}: ${error.message}`);
      // Leave status unchanged — will retry next cycle
      return { externalId, amount, newStatus: TransactionStatus.PENDING, rawResponse: null };
    }
  }

  /**
   * Verify an array of pending transactions in parallel (max 5 at a time).
   */
  async verifyBatch(
    txns: Array<{ externalId: string; amount: number }>,
  ): Promise<VerifiedTransaction[]> {
    const CHUNK = 5;
    const results: VerifiedTransaction[] = [];

    for (let i = 0; i < txns.length; i += CHUNK) {
      const chunk = txns.slice(i, i + CHUNK);
      const batch = await Promise.all(chunk.map((t) => this.verifyOne(t.externalId, t.amount)));
      results.push(...batch);
    }

    return results;
  }

  // ─── eSewa status → our enum ───────────────────────────────────────────────
  private mapStatus(esewaStatus: EsewaStatusResponse['status']): TransactionStatus {
    switch (esewaStatus) {
      case 'COMPLETE':       return TransactionStatus.COMPLETED;
      case 'FULL_REFUND':
      case 'PARTIAL_REFUND': return TransactionStatus.REFUNDED;
      case 'CANCELLED':      return TransactionStatus.CANCELLED;
      case 'AMBIGUOUS':
      case 'PENDING':        return TransactionStatus.PENDING;
      case 'NOT_FOUND':
      default:               return TransactionStatus.FAILED;
    }
  }
}
