import {
  Injectable, CanActivate, ExecutionContext,
  UnauthorizedException, ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Validates the X-API-Key header against RegisteredApp.webhookSecret.
 * Attach with @UseGuards(ApiKeyGuard) on any route that external apps call.
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey =
      request.headers['x-api-key'] ??
      request.headers['authorization']?.replace(/^Bearer\s+/i, '');

    if (!apiKey) {
      throw new UnauthorizedException('Missing X-API-Key header');
    }

    const app = await this.prisma.registeredApp.findFirst({
      where: { webhookSecret: apiKey },
    });

    if (!app) {
      throw new UnauthorizedException('Invalid API key');
    }

    if (!app.isActive) {
      throw new ForbiddenException('This app has been deactivated');
    }

    // Attach the app record to the request so the controller can read it
    request.registeredApp = app;
    return true;
  }
}
