import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { createHmac } from 'crypto';

interface EsewaPaymentRequest {
  amount: number;
  recipientId: string;
  transactionId: string;
}

@Injectable()
export class EsewaService {
  private readonly logger = new Logger(EsewaService.name);
  private readonly baseUrl: string;
  private readonly merchantId: string;
  private readonly secretKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = configService.get<string>('ESEWA_BASE_URL', 'https://uat.esewa.com.np');
    this.merchantId = configService.get<string>('ESEWA_MERCHANT_ID', '');
    this.secretKey = configService.get<string>('ESEWA_SECRET_KEY', '');
  }

  async initiatePayment(params: EsewaPaymentRequest) {
    const { amount, recipientId, transactionId } = params;

    // ── Sandbox / demo mode: no real credentials configured ──────────────────
    const isDemo = !this.merchantId || this.merchantId === 'your_esewa_merchant_id';
    if (isDemo) {
      this.logger.warn(`[eSewa] No credentials configured — using DEMO mode for txn ${transactionId}`);
      return {
        success: true,
        transactionId,
        demo: true,
        providerData: { message: 'eSewa demo mode — payment simulated successfully' },
      };
    }

    const message = `total_amount=${amount},transaction_uuid=${transactionId},product_code=${this.merchantId}`;
    const signature = this.generateSignature(message);

    try {
      const { data } = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/api/epay/main/v2/form`, {
          amount,
          tax_amount: 0,
          total_amount: amount,
          transaction_uuid: transactionId,
          product_code: this.merchantId,
          product_service_charge: 0,
          product_delivery_charge: 0,
          success_url: this.configService.get('ESEWA_SUCCESS_URL'),
          failure_url: this.configService.get('ESEWA_FAILURE_URL'),
          signed_field_names: 'total_amount,transaction_uuid,product_code',
          signature,
        }),
      );
      return { success: true, transactionId, providerData: data };
    } catch (error) {
      this.logger.error(`eSewa payment initiation failed: ${error.message}`);
      throw new InternalServerErrorException('eSewa payment failed');
    }
  }

  async verifyPayment(transactionId: string, amount: number) {
    try {
      const { data } = await firstValueFrom(
        this.httpService.get(
          `${this.baseUrl}/api/epay/transaction/status/?product_code=${this.merchantId}&total_amount=${amount}&transaction_uuid=${transactionId}`,
        ),
      );
      return data;
    } catch (error) {
      this.logger.error(`eSewa verification failed: ${error.message}`);
      throw new InternalServerErrorException('eSewa verification failed');
    }
  }

  private generateSignature(message: string): string {
    return createHmac('sha256', this.secretKey).update(message).digest('base64');
  }
}
