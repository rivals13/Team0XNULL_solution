import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ExternalWalletController } from './external-wallet.controller';
import { ExternalWalletService } from './external-wallet.service';
import { ApiKeyGuard } from './guards/api-key.guard';
import { SyncModule } from '../sync/sync.module';

@Module({
  imports: [
    HttpModule.register({ timeout: 15_000 }),
    SyncModule,   // re-exports PatternAnalysisService
  ],
  controllers: [ExternalWalletController],
  providers: [ExternalWalletService, ApiKeyGuard],
})
export class ExternalWalletModule {}
