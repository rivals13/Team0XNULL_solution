import {
  Controller, Post, Get, Param, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { SyncService } from './sync.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Transaction Sync')
@ApiBearerAuth('JWT')
@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  /**
   * Any authenticated user can manually trigger a sync for themselves.
   * Useful during a demo — no need to wait for the 15-min cron.
   */
  @Post('esewa')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Sync my eSewa transactions',
    description:
      '① Verifies pending eSewa txns against sandbox API  ' +
      '② Upserts statuses in PostgreSQL  ' +
      '③ Sends completed txns to FastAPI pattern analysis  ' +
      '④ Saves suggestions to DB',
  })
  syncMine(@CurrentUser() user: any) {
    return this.syncService.syncUser(user.id);
  }

  /**
   * Admin can trigger sync for any specific user.
   */
  @Post('esewa/:userId')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[ADMIN] Sync eSewa transactions for a specific user' })
  syncForUser(@Param('userId') userId: string) {
    return this.syncService.syncUser(userId);
  }

  /**
   * Admin can kick off a full sync across all active users immediately.
   */
  @Post('esewa/run/all')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: '[ADMIN] Trigger immediate sync for ALL active users' })
  syncAll() {
    // Fire and forget — the cron job handles it asynchronously
    this.syncService.syncAll();
    return { message: 'Full sync started in background' };
  }

  /**
   * Fetch the latest suggestions produced by the most recent pattern analysis.
   */
  @Get('suggestions')
  @ApiOperation({ summary: 'Get AI suggestions generated from my transaction patterns' })
  getMySuggestions(@CurrentUser() user: any) {
    return this.syncService.getPendingSuggestions(user.id);
  }
}
