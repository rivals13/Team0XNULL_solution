import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bull';
import { BillerPollService } from './biller-poll.service';
import { BillerPollController } from './biller-poll.controller';
import { BillerPollProcessor } from './biller-poll.processor';
import { NeaService } from './billers/nea.service';
import { VianetService } from './billers/vianet.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { BILLER_POLL_QUEUE } from '../queue/queue.constants';

@Module({
  imports: [
    HttpModule.register({ timeout: 15_000 }),
    NotificationsModule,
    BullModule.registerQueue({ name: BILLER_POLL_QUEUE }),
  ],
  controllers: [BillerPollController],
  providers:   [BillerPollService, BillerPollProcessor, NeaService, VianetService],
  exports:     [BillerPollService],
})
export class BillerPollModule {}
