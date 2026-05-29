import { Processor, Process, OnQueueFailed, OnQueueCompleted, OnQueueActive } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { ScheduleStatus } from '@prisma/client';
import { PaymentsService } from '../../payments/payments.service';
import { PrismaService } from '../../prisma/prisma.service';
import { WebhookDispatcherService } from '../../webhooks/webhook-dispatcher.service';
import { PAYMENT_QUEUE, EXECUTE_PAYMENT_JOB } from '../queue.constants';

interface ExecutePaymentJob {
  scheduleId?: string;
  userId: string;
  dto?: {
    amount: number;
    provider: string;
    recipientId: string;
    description?: string;
    scheduleId?: string;
  };
}

@Processor(PAYMENT_QUEUE)
export class PaymentProcessor {
  private readonly logger = new Logger(PaymentProcessor.name);

  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly prisma: PrismaService,
    private readonly webhookDispatcher: WebhookDispatcherService,
  ) {}

  @Process(EXECUTE_PAYMENT_JOB)
  async handleExecutePayment(job: Job<ExecutePaymentJob>) {
    const { userId, scheduleId, dto } = job.data;
    this.logger.log(
      `[Queue] Processing job ${job.id} — attempt ${job.attemptsMade + 1}/${job.opts.attempts}`,
    );

    // ── Path A: triggered by queued manual payment (dto present) ─────────────
    if (dto) {
      await job.progress(10);

      // Pre-flight balance check
      const balance = await this.paymentsService.getBalance(userId, dto.provider);
      if (balance < dto.amount) {
        // Non-retryable — throw a plain Error so Bull marks it failed immediately
        throw Object.assign(
          new Error(`Insufficient balance: have ${balance}, need ${dto.amount}`),
          { noRetry: true },
        );
      }

      await job.progress(30);
      const result = await this.paymentsService.execute(userId, dto);
      await job.progress(100);

      // Dispatch outbound webhooks
      await this.webhookDispatcher.dispatchToAll('payment.completed', {
        transactionId: result.id,
        userId,
        amount: dto.amount,
        provider: dto.provider,
        status: 'COMPLETED',
      });

      return result;
    }

    // ── Path B: triggered by schedule cron ────────────────────────────────────
    if (!scheduleId) {
      this.logger.warn(`[Queue] Job ${job.id} has no scheduleId or dto — skipping`);
      return;
    }

    const schedule = await this.prisma.schedule.findUnique({ where: { id: scheduleId } });
    if (!schedule) {
      this.logger.warn(`[Queue] Schedule ${scheduleId} not found — skipping`);
      return;
    }
    if (schedule.status !== ScheduleStatus.ACTIVE) {
      this.logger.log(`[Queue] Schedule ${scheduleId} is ${schedule.status} — skipping`);
      return;
    }

    await job.progress(10);

    // Pre-flight balance check
    const balance = await this.paymentsService.getBalance(userId, schedule.provider);
    if (balance < schedule.amount) {
      // Increment retryCount in DB so we know pre-flight failed
      await this.prisma.schedule.update({
        where: { id: scheduleId },
        data: { retryCount: { increment: 1 } },
      });

      // Dispatch failure webhook before throwing (so external apps are notified)
      await this.webhookDispatcher.dispatchToAll('payment.balance_insufficient', {
        scheduleId,
        userId,
        amount: schedule.amount,
        provider: schedule.provider,
        balance,
        attempt: job.attemptsMade + 1,
      });

      throw new Error(
        `Insufficient balance for schedule ${scheduleId}: have ${balance}, need ${schedule.amount}`,
      );
    }

    await job.progress(30);

    const result = await this.paymentsService.execute(userId, {
      amount: schedule.amount,
      provider: schedule.provider,
      recipientId: schedule.recipientId,
      description: schedule.description ?? undefined,
      scheduleId,
    });

    await job.progress(80);

    // Advance or complete the schedule
    const nextRunAt = this.calculateNextRun(schedule.frequency, schedule.cronExpression);
    if (nextRunAt) {
      await this.prisma.schedule.update({
        where: { id: scheduleId },
        data: { nextRunAt, lastRunAt: new Date(), retryCount: 0 },
      });
    } else {
      await this.prisma.schedule.update({
        where: { id: scheduleId },
        data: { status: ScheduleStatus.COMPLETED, lastRunAt: new Date() },
      });
    }

    await job.progress(100);

    // Outbound webhook
    await this.webhookDispatcher.dispatchToAll('payment.completed', {
      transactionId: result.id,
      scheduleId,
      userId,
      amount: schedule.amount,
      provider: schedule.provider,
      status: 'COMPLETED',
    });

    return result;
  }

  @OnQueueActive()
  onActive(job: Job) {
    this.logger.log(`[Queue] Job ${job.id} (${job.name}) started`);
  }

  @OnQueueCompleted()
  onCompleted(job: Job, result: any) {
    this.logger.log(`[Queue] Job ${job.id} (${job.name}) completed`);
  }

  @OnQueueFailed()
  async onFailed(job: Job, error: Error) {
    const isLastAttempt = job.attemptsMade >= (job.opts.attempts ?? 3);
    this.logger.error(
      `[Queue] Job ${job.id} (${job.name}) failed (attempt ${job.attemptsMade}): ${error.message}`,
    );

    if (isLastAttempt) {
      this.logger.error(`[Queue] Job ${job.id} exhausted all retries — giving up`);

      // Dispatch failure webhook on final attempt
      await this.webhookDispatcher.dispatchToAll('payment.failed', {
        jobId: String(job.id),
        userId: job.data.userId,
        scheduleId: job.data.scheduleId,
        reason: error.message,
        attemptsUsed: job.attemptsMade,
      });
    }
  }

  private calculateNextRun(frequency: string, cronExpression?: string | null): Date | null {
    const now = new Date();
    switch (frequency) {
      case 'DAILY':     return new Date(now.setDate(now.getDate() + 1));
      case 'WEEKLY':    return new Date(now.setDate(now.getDate() + 7));
      case 'BIWEEKLY':  return new Date(now.setDate(now.getDate() + 14));
      case 'MONTHLY':   return new Date(now.setMonth(now.getMonth() + 1));
      case 'QUARTERLY': return new Date(now.setMonth(now.getMonth() + 3));
      case 'YEARLY':    return new Date(now.setFullYear(now.getFullYear() + 1));
      case 'ONCE':      return null;
      default:          return null;
    }
  }
}
