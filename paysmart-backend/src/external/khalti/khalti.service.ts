import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

interface KhaltiPaymentRequest {
  amount: number;
  recipientId: string;
  transactionId: string;
}

@Injectable()
export class KhaltiService {
  private readonly logger = new Logger(KhaltiService.name);
  private readonly baseUrl: string;
  private readonly secretKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = configService.get<string>('KHALTI_BASE_URL', 'https://a.khalti.com/api/v2');
    this.secretKey = configService.get<string>('KHALTI_SECRET_KEY', '');
  }

  async initiatePayment(params: KhaltiPaymentRequest) {
    const { amount, recipientId, transactionId } = params;

    try {
      const { data } = await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/epayment/initiate/`,
          {
            return_url: this.configService.get('KHALTI_RETURN_URL', 'http://localhost:3000/payments/khalti/callback'),
            website_url: 'https://paysmart.app',
            amount: amount * 100, // Khalti uses paisa
            purchase_order_id: transactionId,
            purchase_order_name: 'PaySmart Payment',
            customer_info: { name: 'PaySmart User', phone: recipientId },
          },
          { headers: { Authorization: `Key ${this.secretKey}` } },
        ),
      );
      return { success: true, transactionId, paymentUrl: data.payment_url, pidx: data.pidx };
    } catch (error) {
      this.logger.error(`Khalti payment initiation failed: ${error.message}`);
      throw new InternalServerErrorException('Khalti payment failed');
    }
  }

  async verifyPayment(pidx: string) {
    try {
      const { data } = await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/epayment/lookup/`,
          { pidx },
          { headers: { Authorization: `Key ${this.secretKey}` } },
        ),
      );
      return data;
    } catch (error) {
      this.logger.error(`Khalti verification failed: ${error.message}`);
      throw new InternalServerErrorException('Khalti verification failed');
    }
  }
}
