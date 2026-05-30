import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { BILL_DUE_QUEUE, BILL_DUE_NOTIFICATION_JOB } from '../queue.constants';
import { NotificationsService } from '../../notifications/notifications.service';

export interface BillDueJobData {
  userId:       string;
  merchantName: string;
  merchantSlug: string;
  customerId:   string;
  amount:       number;
  dueDate:      string;
  description:  string;
  billId:       string;
}

/**
 * BillDueProcessor
 *
 * Processes BILL_DUE_NOTIFICATION_JOB from the bill-due-queue.
 * Fires after a configurable delay (20s in testing).
 *
 * Sends a WebSocket `bill.due` event to the user via NotificationsService
 * (which also persists the notification in DB and sends FCM push).
 *
 * The `customerId` is always included in the event payload so the
 * frontend can pre-fill forms.
 *
 * TESTING:  20-second delay (set in biller-accounts.service.ts)
 * PRODUCTION REPLACE WITH:
 *   7 days before due date = first reminder
 *   3 days before due date = second reminder
 *   1 day  before due date = urgent reminder
 *   1 hour before due date = final alert
 */
@Processor(BILL_DUE_QUEUE)
export class BillDueProcessor {
  private readonly logger = new Logger(BillDueProcessor.name);

  constructor(private readonly notifications: NotificationsService) {}

  @Process(BILL_DUE_NOTIFICATION_JOB)
  async handle(job: Job<BillDueJobData>) {
    const { userId, merchantName, merchantSlug, customerId, amount, dueDate, description, billId } = job.data;

    this.logger.log(
      `[BillDue] Firing notification for user ${userId} — ${merchantName} / ${customerId} / NPR ${amount}`,
    );

    const daysUntil = Math.ceil((new Date(dueDate).getTime() - Date.now()) / 86_400_000);
    const dueLine   = daysUntil <= 0
      ? 'due today'
      : `due in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`;

    await this.notifications.sendNotification(
      userId,
      'BILL_DUE',
      `Bill due: ${merchantName}`,
      `NPR ${amount.toLocaleString()} ${dueLine}. ${description}`.trim(),
      {
        merchantName,
        merchantSlug,
        customerId,    // ← crucial: included so frontend popup can pre-fill schedule form
        amount,
        dueDate,
        description,
        billId,
      },
    );

    this.logger.log(`[BillDue] Notification sent for user ${userId} / ${merchantName} / ${customerId}`);
  }
}
