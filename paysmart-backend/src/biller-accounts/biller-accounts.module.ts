import { Module } from '@nestjs/common';
import { BillerAccountsController } from './biller-accounts.controller';
import { BillerAccountsService } from './biller-accounts.service';

@Module({
  controllers: [BillerAccountsController],
  providers:   [BillerAccountsService],
  exports:     [BillerAccountsService],
})
export class BillerAccountsModule {}
