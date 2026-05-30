import { Module } from '@nestjs/common';
import { BillInquiryService } from './bill-inquiry.service';
import { BillInquiryController } from './bill-inquiry.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports:     [NotificationsModule],
  controllers: [BillInquiryController],
  providers:   [BillInquiryService],
  exports:     [BillInquiryService],
})
export class BillInquiryModule {}
