import { Module } from '@nestjs/common';
import { MerchantService } from './merchant.service';
import { MerchantController } from './merchant.controller';
import { MerchantApiKeyGuard } from './guards/merchant-api-key.guard';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports:     [NotificationsModule],
  controllers: [MerchantController],
  providers:   [MerchantService, MerchantApiKeyGuard],
  exports:     [MerchantService],
})
export class MerchantModule {}
