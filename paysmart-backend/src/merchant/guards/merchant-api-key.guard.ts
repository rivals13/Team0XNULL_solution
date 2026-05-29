import {
  Injectable, CanActivate, ExecutionContext,
  UnauthorizedException, ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Validates the X-API-Key header against Merchant.apiKey.
 * Attaches the merchant record to `request.merchant` for use in controllers.
 */
@Injectable()
export class MerchantApiKeyGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey  =
      request.headers['x-api-key'] ??
      request.headers['authorization']?.replace(/^Bearer\s+/i, '');

    if (!apiKey) {
      throw new UnauthorizedException('Missing X-API-Key header');
    }

    const merchant = await this.prisma.merchant.findUnique({
      where: { apiKey },
    });

    if (!merchant) {
      throw new UnauthorizedException('Invalid merchant API key');
    }

    if (!merchant.isActive) {
      throw new ForbiddenException('This merchant account is deactivated');
    }

    request.merchant = merchant;
    return true;
  }
}
