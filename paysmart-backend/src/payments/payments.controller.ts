import { Controller, Post, Get, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { ExecutePaymentDto } from './dto/execute-payment.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Payments')
@ApiBearerAuth('JWT')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * Synchronous — blocks until eSewa responds.
   * Good for one-off manual payments.
   */
  @Post('execute')
  @ApiOperation({ summary: 'Execute a payment immediately (synchronous)' })
  execute(@CurrentUser() user: any, @Body() dto: ExecutePaymentDto) {
    return this.paymentsService.execute(user.id, dto);
  }

  /**
   * Async — enqueues to Bull Queue, returns jobId immediately.
   * The processor retries up to 3 times with exponential back-off.
   * Use GET /payments/jobs/:jobId to poll status.
   */
  @Post('queue')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Queue a payment via Bull / Redis (async, 3 retries)',
    description:
      'Balance is checked immediately. If OK the job is enqueued and the endpoint ' +
      'returns 202 + jobId. Track progress with GET /payments/jobs/:jobId.',
  })
  queuePayment(@CurrentUser() user: any, @Body() dto: ExecutePaymentDto) {
    return this.paymentsService.queuePayment(user.id, dto);
  }

  /**
   * Poll a queued job's status.
   */
  @Get('jobs/:jobId')
  @ApiOperation({ summary: 'Get Bull Queue job status by jobId' })
  jobStatus(@Param('jobId') jobId: string) {
    return this.paymentsService.getJobStatus(jobId);
  }

  /**
   * Get current demo balance for the logged-in user.
   */
  @Get('balance')
  @ApiOperation({ summary: 'Get current demo balance (NPR)' })
  async getBalance(@CurrentUser() user: any) {
    const balance = await this.paymentsService.getBalance(user.id, 'ESEWA');
    return { balance };
  }
}
