import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Public } from '../decorators/public.decorator';

@ApiTags('Security')
@Controller('security')
export class SecurityController {
  constructor(private readonly configService: ConfigService) {}

  /**
   * GET /api/v1/security/status
   * Public endpoint — no authentication required.
   * Returns a snapshot of which security features are active.
   */
  @Public()
  @Get('status')
  @ApiOperation({
    summary: '[Public] Security feature status',
    description:
      'Returns whether each security layer (helmet, HMAC, rate-limiting, secure ' +
      'logging, HTTPS, encryption) is currently active.',
  })
  status() {
    const hmacSecret     = this.configService.get<string>('HMAC_SECRET', '');
    const encryptionKey  = this.configService.get<string>('ENCRYPTION_KEY', '');
    const nodeEnv        = this.configService.get<string>('NODE_ENV', 'development');

    return {
      helmetEnabled:        true,
      hmacSigningEnabled:   !!hmacSecret,
      rateLimitingEnabled:  true,
      secureLoggingEnabled: true,
      httpsReady:           nodeEnv === 'production',
      encryptionReady:      !!encryptionKey,
    };
  }
}
