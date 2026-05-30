import { Module } from '@nestjs/common';
import { BillerAccountsController } from './biller-accounts.controller';
import { BillerAccountsService } from './biller-accounts.service';
import { BillInquiryModule } from '../bill-inquiry/bill-inquiry.module';

@Module({
  imports:     [BillInquiryModule],
  controllers: [BillerAccountsController],
  providers:   [BillerAccountsService],
  exports:     [BillerAccountsService],
})
export class BillerAccountsModule {}
