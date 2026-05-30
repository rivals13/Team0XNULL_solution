import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { BillerAccountsController } from './biller-accounts.controller';
import { BillerAccountsService } from './biller-accounts.service';
import { BillInquiryModule } from '../bill-inquiry/bill-inquiry.module';
import { BILL_DUE_QUEUE } from '../queue/queue.constants';

@Module({
  imports: [
    BillInquiryModule,
    BullModule.registerQueue({ name: BILL_DUE_QUEUE }),
  ],
  controllers: [BillerAccountsController],
  providers:   [BillerAccountsService],
  exports:     [BillerAccountsService],
})
export class BillerAccountsModule {}
