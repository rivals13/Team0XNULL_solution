import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Request } from 'express';
import { ConsentService } from './consent.service';
import { GrantConsentDto } from './dto/grant-consent.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Consent')
@ApiBearerAuth()
@Controller('consent')
export class ConsentController {
  constructor(private readonly consentService: ConsentService) {}

  @Get('status')
  @ApiOperation({ summary: 'Check eSewa data-sharing consent status' })
  @ApiResponse({ status: 200, description: 'Consent status returned' })
  async status(@CurrentUser() user: any) {
    const [hasConsent, isExpired, record] = await Promise.all([
      this.consentService.checkConsent(user.sub),
      this.consentService.isConsentExpired(user.sub),
      this.consentService.getConsent(user.sub),
    ]);

    return {
      hasActiveConsent: hasConsent,
      isExpired,
      grantedAt: record?.grantedAt ?? null,
      expiresAt: record?.expiresAt ?? null,
      revokedAt: record?.revokedAt ?? null,
      dataTypes: record?.dataTypes ?? [],
      message: hasConsent
        ? 'Consent is active'
        : isExpired
          ? 'Consent has expired — please renew'
          : 'No consent on record — please grant consent to use eSewa features',
    };
  }

  @Post('grant')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Grant consent to access eSewa data' })
  @ApiResponse({
    status: 200,
    description: `
      You are granting PaySmart permission to access the following eSewa data:
      • Transaction history (amount, payee, date, status)
      • Basic profile (phone number linked to eSewa)
      • Bill payment records

      What we DO NOT store: passwords, MPINs, OTPs, full bank account numbers, CVV.
      Consent expires in 90 days. You can revoke at any time.
    `,
  })
  async grant(
    @CurrentUser() user: any,
    @Body() dto: GrantConsentDto,
    @Req() req: Request,
  ) {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] ?? req.socket?.remoteAddress ?? '';
    const userAgent = req.headers['user-agent'] ?? '';

    await this.consentService.grantConsent(user.sub, dto.dataTypes, ip, userAgent);

    return {
      message: 'Consent granted successfully',
      dataTypes: dto.dataTypes,
      expiresInDays: 90,
      note: 'You can revoke consent at any time via DELETE /api/v1/consent',
    };
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke eSewa data-sharing consent' })
  @ApiResponse({ status: 200, description: 'Consent revoked' })
  async revoke(@CurrentUser() user: any) {
    await this.consentService.revokeConsent(user.sub);
    return {
      message: 'Consent revoked. PaySmart will no longer access your eSewa data.',
    };
  }
}
