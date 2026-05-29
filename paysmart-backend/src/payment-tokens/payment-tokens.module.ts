import { Module } from '@nestjs/common';
import { PaymentTokensService } from './payment-tokens.service';

@Module({
  providers: [PaymentTokensService],
  exports: [PaymentTokensService],
})
export class PaymentTokensModule {}
