import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { ExternalModule } from '../external/external.module';
import { SmsModule } from '../sms/sms.module';
import { PAYMENT_QUEUE } from '../queue/queue.constants';
import { CommunityModule } from '../community/community.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: PAYMENT_QUEUE }),
    NotificationsModule,
    ExternalModule,
    SmsModule,
    CommunityModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
