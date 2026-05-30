import { Module } from '@nestjs/common';
import { BillInquiryService } from './bill-inquiry.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports:   [NotificationsModule],
  providers: [BillInquiryService],
  exports:   [BillInquiryService],
})
export class BillInquiryModule {}
