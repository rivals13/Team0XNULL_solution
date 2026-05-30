import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bull';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TransactionsModule } from './transactions/transactions.module';
import { SchedulePaymentModule } from './schedule/schedule.module';
import { PaymentsModule } from './payments/payments.module';
import { NotificationsModule } from './notifications/notifications.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { ExternalModule } from './external/external.module';
import { QueueModule } from './queue/queue.module';
import { SmsModule } from './sms/sms.module';
import { SyncModule } from './sync/sync.module';
import { ExternalWalletModule } from './external-wallet/external-wallet.module';
import { BillerPollModule } from './biller-poll/biller-poll.module';
import { CommunityModule } from './community/community.module';
import { MerchantModule } from './merchant/merchant.module';
import { BillerAccountsModule } from './biller-accounts/biller-accounts.module';
import { CommonModule } from './common/common.module';
import { ConsentModule } from './consent/consent.module';
import { DataMinimizationModule } from './data-minimization/data-minimization.module';
import { AuditLogModule } from './audit-log/audit-log.module';
import { PaymentTokensModule } from './payment-tokens/payment-tokens.module';
import { BillInquiryModule } from './bill-inquiry/bill-inquiry.module';
import { MockMerchantModule } from './mock-merchant/mock-merchant.module';

@Module({
  imports: [
    // ─── Config ─────────────────────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // ─── Rate Limiting ───────────────────────────────────────────────────────
    // ThrottlerGuard is registered as a global APP_GUARD (see providers below).
    // Route-level @Throttle() decorators override these defaults per-endpoint.
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          name:  'default',
          ttl:   config.get<number>('THROTTLE_TTL', 60) * 1_000, // env = seconds → convert to ms
          limit: config.get<number>('THROTTLE_LIMIT', 100),
        },
      ],
    }),

    // ─── Cron Jobs ───────────────────────────────────────────────────────────
    ScheduleModule.forRoot(),

    // ─── Bull Queue ──────────────────────────────────────────────────────────
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        redis: {
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
          password: config.get<string>('REDIS_PASSWORD') || undefined,
          // Fail immediately instead of retrying 20× (each retry hangs for seconds).
          // With try/catch guards in service methods this means queue ops fail-fast
          // and the actual DB operation still succeeds.
          maxRetriesPerRequest: 0,
        },
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 50,
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        },
      }),
    }),

    // ─── Feature Modules ─────────────────────────────────────────────────────
    PrismaModule,
    AuthModule,
    UsersModule,
    TransactionsModule,
    SchedulePaymentModule,
    PaymentsModule,
    NotificationsModule,
    WebhooksModule,
    ExternalModule,
    QueueModule,
    SmsModule,
    SyncModule,
    ExternalWalletModule,
    BillerPollModule,
    CommunityModule,
    MerchantModule,
    BillerAccountsModule,
    CommonModule,
    ConsentModule,
    DataMinimizationModule,
    AuditLogModule,
    PaymentTokensModule,
    BillInquiryModule,
    MockMerchantModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // ─── Global Guards ────────────────────────────────────────────────────────
    // JWT + Roles guards are registered in AuthModule.
    // ThrottlerGuard enforces rate limits globally (overridable per-route).
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
