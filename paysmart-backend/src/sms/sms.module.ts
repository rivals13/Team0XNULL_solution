import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { SmsService } from './sms.service';
import { OtpService } from './otp.service';
import { SmsController } from './sms.controller';

@Module({
  imports: [
    HttpModule.register({
      timeout: 8000,
      maxRedirects: 3,
    }),
  ],
  controllers: [SmsController],
  providers: [SmsService, OtpService],
  exports: [SmsService, OtpService],
})
export class SmsModule {}
