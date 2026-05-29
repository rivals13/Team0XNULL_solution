import {
  Controller, Post, Get, Patch, Delete, Body, Param,
  Headers, Req, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';
import { UserRole } from '@prisma/client';
import { WebhooksService } from './webhooks.service';
import { WebhookDispatcherService, WebhookEvent } from './webhook-dispatcher.service';
import { RegisterAppDto, UpdateAppDto } from './dto/register-app.dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhooksController {
  constructor(
    private readonly webhooksService: WebhooksService,
    private readonly dispatcher: WebhookDispatcherService,
  ) {}

  // ─── Inbound: eSewa / Khalti → PaySmart ───────────────────────────────────

  @Public()
  @Post('esewa')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Public] Receive inbound eSewa payment webhook' })
  esewaWebhook(
    @Body() payload: any,
    @Headers('x-esewa-signature') signature: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    const rawBody = req.rawBody?.toString() ?? JSON.stringify(payload);
    this.webhooksService.verifySignature(rawBody, signature);
    return this.webhooksService.handleEsewaWebhook(payload);
  }

  @Public()
  @Post('khalti')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Public] Receive inbound Khalti payment webhook' })
  khaltiWebhook(
    @Body() payload: any,
    @Headers('x-khalti-signature') signature: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    const rawBody = req.rawBody?.toString() ?? JSON.stringify(payload);
    this.webhooksService.verifySignature(rawBody, signature);
    return this.webhooksService.handleKhaltiWebhook(payload);
  }

  // ─── Registered App Management (ADMIN only) ───────────────────────────────

  @Post('apps')
  @ApiBearerAuth('JWT')
  @Roles(UserRole.ADMIN, UserRole.MERCHANT)
  @ApiOperation({
    summary: '[ADMIN/MERCHANT] Register an external app to receive PaySmart events',
    description:
      'Returns the webhookSecret — save it immediately, it will not be shown again. ' +
      'PaySmart signs every outbound payload with HMAC-SHA256 using this secret.',
  })
  registerApp(@Body() dto: RegisterAppDto) {
    return this.webhooksService.registerApp(dto);
  }

  @Get('apps')
  @ApiBearerAuth('JWT')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[ADMIN] List all registered apps' })
  listApps() {
    return this.webhooksService.listApps();
  }

  @Get('apps/:id')
  @ApiBearerAuth('JWT')
  @Roles(UserRole.ADMIN, UserRole.MERCHANT)
  @ApiOperation({ summary: '[ADMIN/MERCHANT] Get a registered app (secret omitted)' })
  getApp(@Param('id') id: string) {
    return this.webhooksService.getApp(id);
  }

  @Patch('apps/:id')
  @ApiBearerAuth('JWT')
  @Roles(UserRole.ADMIN, UserRole.MERCHANT)
  @ApiOperation({ summary: '[ADMIN/MERCHANT] Update app name, webhookUrl, or active status' })
  updateApp(@Param('id') id: string, @Body() dto: UpdateAppDto) {
    return this.webhooksService.updateApp(id, dto);
  }

  @Post('apps/:id/rotate-secret')
  @ApiBearerAuth('JWT')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[ADMIN] Rotate the webhook signing secret for an app' })
  rotateSecret(@Param('id') id: string) {
    return this.webhooksService.rotateSecret(id);
  }

  @Delete('apps/:id')
  @ApiBearerAuth('JWT')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[ADMIN] Delete a registered app' })
  deleteApp(@Param('id') id: string) {
    return this.webhooksService.deleteApp(id);
  }

  // ─── Manual dispatch (ADMIN test trigger) ─────────────────────────────────

  @Post('apps/:id/test')
  @ApiBearerAuth('JWT')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[ADMIN] Fire a test event to a specific registered app' })
  testDispatch(@Param('id') id: string): Promise<Record<string, any>> {
    return this.dispatcher.dispatchToApp(id, 'payment.completed' as WebhookEvent, {
      test: true,
      message: 'This is a PaySmart webhook test delivery',
      timestamp: new Date().toISOString(),
    });
  }
}
