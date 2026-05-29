import { Controller, Post, Body, Req, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader, ApiResponse } from '@nestjs/swagger';
import { Request } from 'express';
import { ExternalWalletService } from './external-wallet.service';
import { PushTransactionsDto } from './dto/push-transactions.dto';
import { ApiKeyGuard } from './guards/api-key.guard';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('External Wallet')
@Controller('external')
export class ExternalWalletController {
  constructor(private readonly service: ExternalWalletService) {}

  /**
   * Called by external wallet / fintech apps.
   * Auth: X-API-Key: <webhookSecret from POST /webhooks/apps>
   */
  @Public()
  @UseGuards(ApiKeyGuard)
  @Post('push-transactions')
  @HttpCode(HttpStatus.OK)
  @ApiHeader({
    name: 'X-API-Key',
    description: 'API key received when you registered your app via POST /webhooks/apps',
    required: true,
  })
  @ApiOperation({
    summary: 'Push external wallet transactions for PaySmart pattern analysis',
    description: `
External apps (other wallets, fintech apps) call this endpoint to push their user's
transaction history to PaySmart. PaySmart stores the transactions, runs them through
FastAPI pattern analysis, and returns AI-generated spending suggestions.

**Authentication**: Include X-API-Key header using the \`webhookSecret\` you received
when registering your app via \`POST /webhooks/apps\`.

**Flow**:
1. Validate API key → identify calling app
2. Validate PaySmart \`user_id\` exists
3. Save transactions to PaySmart DB (provider = app_source)
4. Send full transaction history to FastAPI \`/analyze/patterns\`
5. Store returned suggestions
6. Return suggestions to your app immediately
    `.trim(),
  })
  @ApiResponse({ status: 200, description: 'Transactions received and analysed' })
  @ApiResponse({ status: 401, description: 'Missing or invalid X-API-Key' })
  @ApiResponse({ status: 404, description: 'PaySmart user_id not found' })
  pushTransactions(@Body() dto: PushTransactionsDto, @Req() req: Request & { registeredApp: any }) {
    return this.service.pushTransactions(dto, req.registeredApp?.name ?? dto.app_source);
  }
}
