import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { EsewaService } from './esewa/esewa.service';
import { KhaltiService } from './khalti/khalti.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 3,
    }),
  ],
  providers: [EsewaService, KhaltiService],
  exports: [EsewaService, KhaltiService],
})
export class ExternalModule {}
