import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bull';
import { ScheduleService } from './schedule.service';
import { ScheduleController } from './schedule.controller';
import { BalanceService } from './balance.service';
import { SmsModule } from '../sms/sms.module';
import { BillInquiryModule } from '../bill-inquiry/bill-inquiry.module';
import { PAYMENT_QUEUE, SCHEDULE_QUEUE } from '../queue/queue.constants';

@Module({
  imports: [
    BullModule.registerQueue({ name: PAYMENT_QUEUE }),
    BullModule.registerQueue({ name: SCHEDULE_QUEUE }),
    HttpModule.register({ timeout: 8000 }),
    SmsModule,
    BillInquiryModule,
  ],
  controllers: [ScheduleController],
  providers: [ScheduleService, BalanceService],
  exports: [ScheduleService, BalanceService],
})
export class SchedulePaymentModule {}
