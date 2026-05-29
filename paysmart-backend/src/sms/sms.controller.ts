import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { OtpService } from './otp.service';
import { SendOtpDto, VerifyOtpDto } from './dto/otp.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('SMS / OTP')
@Controller('sms')
export class SmsController {
  constructor(private readonly otpService: OtpService) {}

  /**
   * Public — anyone can request an OTP for a phone number.
   * Rate-limited by the global ThrottlerGuard.
   */
  @Public()
  @Post('otp/send')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60_000 } }) // max 3 OTP requests per minute per IP
  @ApiOperation({ summary: 'Send a 6-digit OTP to a Nepal phone number' })
  sendOtp(@Body() dto: SendOtpDto) {
    return this.otpService.sendOtp(dto.phone);
  }

  /**
   * Public — user submits the OTP they received.
   */
  @Public()
  @Post('otp/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify an OTP — returns { verified: true } on success' })
  verifyOtp(@Body() dto: VerifyOtpDto) {
    this.otpService.verifyOtp(dto.phone, dto.otp);
    return { verified: true, phone: dto.phone };
  }

  /**
   * Authenticated — let a logged-in user (re)verify their own phone.
   */
  @Post('otp/send-mine')
  @ApiBearerAuth('JWT')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send OTP to the current user\'s registered phone number' })
  sendOtpToSelf(@CurrentUser() user: any) {
    if (!user.phone) {
      return { message: 'No phone number on your account. Add one first.' };
    }
    return this.otpService.sendOtp(user.phone);
  }
}
