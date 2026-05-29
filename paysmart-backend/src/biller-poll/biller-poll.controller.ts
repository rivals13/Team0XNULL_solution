import { Controller, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { BillerPollService } from './biller-poll.service';

@ApiTags('Biller Poll')
@ApiBearerAuth('JWT')
@Controller('biller-poll')
export class BillerPollController {
  constructor(private readonly billerPoll: BillerPollService) {}

  /**
   * Manually trigger the biller poll right now (admin only).
   * Useful for testing without waiting for the 08:00 cron.
   */
  @Roles(UserRole.ADMIN)
  @Post('trigger')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Trigger biller poll immediately (Admin)',
    description:
      'Runs the same poll the daily cron would run at 08:00 NPT. ' +
      'Fetches NEA and Vianet bills for all active biller accounts, ' +
      'saves new bills, and pushes BILL_DUE notifications to users.',
  })
  @ApiResponse({ status: 200, description: 'Poll completed' })
  @ApiResponse({ status: 403, description: 'Admins only' })
  async trigger(): Promise<Record<string, any>> {
    return this.billerPoll.triggerPollNow();
  }
}
