import { Module } from '@nestjs/common';
import { CommunityTriggerService } from './community-trigger.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports:   [NotificationsModule],
  providers: [CommunityTriggerService],
  exports:   [CommunityTriggerService],
})
export class CommunityModule {}
