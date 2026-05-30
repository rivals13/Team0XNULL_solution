import { Module } from '@nestjs/common';
import { MockMerchantController } from './mock-merchant.controller';

@Module({
  controllers: [MockMerchantController],
})
export class MockMerchantModule {}
