import { Processor, Process, OnQueueFailed, OnQueueCompleted } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { BILLER_POLL_QUEUE, POLL_ALL_BILLERS_JOB } from '../queue/queue.constants';
import { BillerPollService } from './biller-poll.service';

@Processor(BILLER_POLL_QUEUE)
export class BillerPollProcessor {
  private readonly logger = new Logger(BillerPollProcessor.name);

  constructor(private readonly billerPoll: BillerPollService) {}

  @Process(POLL_ALL_BILLERS_JOB)
  async handlePollAllBillers(job: Job): Promise<Record<string, any>> {
    this.logger.log(`[BillerPollQueue] Processing job ${job.id} — running full biller poll`);
    const summary = await this.billerPoll.executePoll();
    this.logger.log(
      `[BillerPollQueue] Job ${job.id} done — ` +
      `polled: ${summary.polledAccounts}, saved: ${summary.billsSaved}, errors: ${summary.errors}`,
    );
    return summary;
  }

  @OnQueueCompleted()
  onCompleted(job: Job, result: any) {
    this.logger.log(
      `[BillerPollQueue] ✓ Job ${job.id} completed — ` +
      `bills saved: ${result?.billsSaved ?? 0}`,
    );
  }

  @OnQueueFailed()
  onFailed(job: Job, err: Error) {
    this.logger.error(
      `[BillerPollQueue] ✗ Job ${job.id} failed (attempt ${job.attemptsMade}): ${err.message}`,
    );
  }
}
