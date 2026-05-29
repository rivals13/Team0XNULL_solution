import { Module } from '@nestjs/common';
import { DataMinimizationService } from './data-minimization.service';

@Module({
  providers: [DataMinimizationService],
  exports: [DataMinimizationService],
})
export class DataMinimizationModule {}
