import {
  Injectable, BadRequestException, InternalServerErrorException, NotFoundException,
} from '@nestjs/common';
import { SecureLoggerService } from '../common/logger/secure-logger.service';
import { EncryptionService } from '../common/encryption/encryption.service';
import { InjectQueue } from '@nestjs/bull';
import { Queue, Job } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SmsService } from '../sms/sms.service';
import { SmsTemplates } from '../sms/sms.templates';
import { EsewaService } from '../external/esewa/esewa.service';
import { KhaltiService } from '../external/khalti/khalti.service';
import { ExecutePaymentDto } from './dto/execute-payment.dto';
import { TransactionStatus } from '../transactions/dto/create-transaction.dto';
import { PAYMENT_QUEUE, EXECUTE_PAYMENT_JOB } from '../queue/queue.constants';
import { CommunityTriggerService } from '../community/community-trigger.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new SecureLoggerService(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly smsService: SmsService,
    private readonly esewaService: EsewaService,
    private readonly khaltiService: KhaltiService,
    private readonly community: CommunityTriggerService,
    private readonly enc: EncryptionService,
    @InjectQueue(PAYMENT_QUEUE) private readonly paymentQueue: Queue,
  ) {}

  // ─── Synchronous execution (used internally by processor) ─────────────────

  async execute(userId: string, dto: ExecutePaymentDto) {
    const balance = await this.getBalance(userId, dto.provider);
    if (balance < dto.amount) {
      throw new BadRequestException(
        `Insufficient balance. Available: ${balance}, Required: ${dto.amount}`,
      );
    }

    const transaction = await this.prisma.transaction.create({
      data: {
        userId,
        amount: dto.amount,
        provider: dto.provider,
        recipientId: dto.recipientId ? this.enc.encrypt(dto.recipientId) : dto.recipientId,
        description: dto.description,
        scheduleId: dto.scheduleId,
        status: TransactionStatus.PENDING,
        type: 'DEBIT',
      },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true },
    });

    try {
      let providerResponse: any;
      if (dto.provider.toUpperCase() === 'ESEWA') {
        providerResponse = await this.esewaService.initiatePayment({
          amount: dto.amount,
          recipientId: dto.recipientId,
          transactionId: transaction.id,
        });
      } else if (dto.provider.toUpperCase() === 'KHALTI') {
        providerResponse = await this.khaltiService.initiatePayment({
          amount: dto.amount,
          recipientId: dto.recipientId,
          transactionId: transaction.id,
        });
      } else {
        throw new BadRequestException(`Unsupported provider: ${dto.provider}`);
      }

      const completed = await this.prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: TransactionStatus.COMPLETED,
          externalId: providerResponse.transactionId,
          completedAt: new Date(),
        },
      });

      // Deduct from demo balance
      await this.deductBalance(userId, dto.provider, dto.amount);

      // Mark the originating bill as PAID (if billId was supplied)
      if (dto.billId) {
        this.prisma.bill.update({
          where: { id: dto.billId },
          data: { status: 'PAID', paidAt: new Date() },
        }).catch(e => this.logger.warn(`Bill ${dto.billId} mark-paid failed: ${e.message}`));
      }

      // Fire-and-forget notifications
      this.notificationsService.sendPaymentNotification(userId, {
        type: 'PAYMENT_SUCCESS',
        amount: dto.amount,
        provider: dto.provider,
        transactionId: transaction.id,
      });
      if (user?.phone) {
        const plainPhone = this.enc.decrypt(user.phone);
        this.smsService.send(
          plainPhone,
          SmsTemplates.paymentSuccess(dto.amount, dto.provider, transaction.id),
        );
      }
      // Community trigger — check if classmates should be nudged (non-blocking)
      if (dto.recipientId) {
        this.community.checkAndNotify(userId, dto.recipientId);
      }

      return completed;
    } catch (error) {
      await this.prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: TransactionStatus.FAILED, failureReason: error.message },
      });
      this.notificationsService.sendPaymentNotification(userId, {
        type: 'PAYMENT_FAILED',
        amount: dto.amount,
        provider: dto.provider,
        transactionId: transaction.id,
        error: error.message,
      });
      if (user?.phone) {
        const plainPhone = this.enc.decrypt(user.phone);
        this.smsService.send(plainPhone, SmsTemplates.paymentFailed(dto.amount, dto.provider, error.message));
      }
      this.logger.error(`Payment failed for tx ${transaction.id}: ${error.message}`);
      throw new InternalServerErrorException('Payment execution failed');
    }
  }

  // ─── Queue-based execution (returns immediately with job ID) ──────────────

  async queuePayment(userId: string, dto: ExecutePaymentDto): Promise<{ jobId: string; status: string }> {
    const balance = await this.getBalance(userId, dto.provider);
    if (balance < dto.amount) {
      throw new BadRequestException(
        `Insufficient balance. Available: ${balance}, Required: ${dto.amount}`,
      );
    }

    const job = await this.paymentQueue.add(
      EXECUTE_PAYMENT_JOB,
      { userId, dto },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5_000 },
        removeOnComplete: { count: 200 },
        removeOnFail: { count: 100 },
      },
    );

    this.logger.log(`Payment queued — jobId: ${job.id} for user: ${userId}`);
    return { jobId: String(job.id), status: 'queued' };
  }

  // ─── Job status check ─────────────────────────────────────────────────────

  async getJobStatus(jobId: string) {
    const job = await this.paymentQueue.getJob(jobId);
    if (!job) throw new NotFoundException(`Job ${jobId} not found`);

    const state    = await job.getState();
    const progress = job.progress();
    const failedReason = job.failedReason ?? null;

    return {
      jobId,
      state,       // waiting | active | completed | failed | delayed
      progress,
      attempts: job.attemptsMade,
      maxAttempts: job.opts.attempts,
      failedReason,
      data: job.data,
      processedOn: job.processedOn ? new Date(job.processedOn) : null,
      finishedOn:  job.finishedOn  ? new Date(job.finishedOn)  : null,
    };
  }

  // ─── Balance (in-memory demo tracker — resets on server restart) ─────────
  private readonly demoBalances = new Map<string, number>();
  private readonly INITIAL_BALANCE = 10_00_000; // NPR 10,00,000

  async getBalance(userId: string, _provider: string): Promise<number> {
    if (!this.demoBalances.has(userId)) {
      this.demoBalances.set(userId, this.INITIAL_BALANCE);
    }
    return this.demoBalances.get(userId)!;
  }

  async deductBalance(userId: string, _provider: string, amount: number): Promise<number> {
    const current = await this.getBalance(userId, _provider);
    const updated = Math.max(0, current - amount);
    this.demoBalances.set(userId, updated);
    return updated;
  }
}
