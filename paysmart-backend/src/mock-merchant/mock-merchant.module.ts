import { Module } from '@nestjs/common';
import { MockMerchantController } from './mock-merchant.controller';
import { BillInquiryModule } from '../bill-inquiry/bill-inquiry.module';

@Module({
  imports:     [BillInquiryModule],
  controllers: [MockMerchantController],
})
export class MockMerchantModule {}
