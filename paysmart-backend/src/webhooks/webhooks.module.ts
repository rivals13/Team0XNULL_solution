import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { WebhooksService } from './webhooks.service';
import { WebhooksController } from './webhooks.controller';
import { WebhookDispatcherService } from './webhook-dispatcher.service';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [
    HttpModule.register({ timeout: 10_000, maxRedirects: 2 }),
    CommonModule, // provides HmacService for signing
  ],
  controllers: [WebhooksController],
  providers: [WebhooksService, WebhookDispatcherService],
  exports: [WebhooksService, WebhookDispatcherService],
})
export class WebhooksModule {}
