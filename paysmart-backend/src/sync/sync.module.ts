import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { SyncService } from './sync.service';
import { SyncController } from './sync.controller';
import { EsewaSyncService } from './esewa-sync.service';
import { PatternAnalysisService } from './pattern-analysis.service';
import { TransactionAnalysisService } from './transaction-analysis.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    HttpModule.register({ timeout: 15_000, maxRedirects: 3 }),
    NotificationsModule,   // TransactionAnalysisService needs NotificationsService
  ],
  controllers: [SyncController],
  providers: [SyncService, EsewaSyncService, PatternAnalysisService, TransactionAnalysisService],
  exports:   [SyncService, PatternAnalysisService, TransactionAnalysisService],
})
export class SyncModule {}
