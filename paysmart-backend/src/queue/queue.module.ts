import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bull';
import { PaymentProcessor } from './processors/payment.processor';
import { BalanceCheckProcessor } from './processors/balance-check.processor';
import { BillDueProcessor } from './processors/bill-due.processor';
import { PaymentsModule } from '../payments/payments.module';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { BalanceService } from '../schedule/balance.service';
import { SmsModule } from '../sms/sms.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';
import { PAYMENT_QUEUE, SCHEDULE_QUEUE, BILL_DUE_QUEUE } from './queue.constants';

@Module({
  imports: [
    BullModule.registerQueue({ name: PAYMENT_QUEUE }),
    BullModule.registerQueue({ name: SCHEDULE_QUEUE }),
    BullModule.registerQueue({ name: BILL_DUE_QUEUE }),
    HttpModule.register({ timeout: 8_000 }),
    PaymentsModule,
    WebhooksModule,
    SmsModule,
    NotificationsModule,
    UsersModule,
  ],
  providers: [PaymentProcessor, BalanceCheckProcessor, BillDueProcessor, BalanceService],
})
export class QueueModule {}
