import { Injectable, Logger } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsGateway } from './notifications.gateway';
import { FirebaseService } from './firebase.service';

interface PaymentNotificationPayload {
  type: Extract<
    NotificationType,
    'PAYMENT_SUCCESS' | 'PAYMENT_FAILED' | 'SCHEDULE_TRIGGERED' | 'SCHEDULE_REMINDER'
  >;
  amount: number;
  provider: string;
  transactionId: string;
  error?: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: NotificationsGateway,
    private readonly firebase: FirebaseService,
  ) {}

  // ─── Payment notifications ─────────────────────────────────────────────────

  async sendPaymentNotification(userId: string, payload: PaymentNotificationPayload) {
    const title = this.buildTitle(payload);
    const body  = this.buildBody(payload);

    // 1. Persist in DB
    const notification = await this.prisma.notification.create({
      data: { userId, type: payload.type, title, body, metadata: payload as any },
    });

    // 2. Real-time WebSocket push
    this.gateway.emitToUser(userId, 'notification', {
      id:        notification.id,
      type:      payload.type,
      title,
      body,
      createdAt: notification.createdAt,
    });

    // 3. WS-specific typed event for payment result
    if (payload.type === 'PAYMENT_SUCCESS') {
      this.gateway.emitToUser(userId, 'payment.success', {
        amount: payload.amount,
        provider: payload.provider,
        transactionId: payload.transactionId,
      });
    } else if (payload.type === 'PAYMENT_FAILED') {
      this.gateway.emitToUser(userId, 'payment.failed', {
        amount: payload.amount,
        provider: payload.provider,
        error: payload.error,
      });
    }

    // 4. FCM push (supports multiple devices via multicast)
    await this.sendFcm(userId, title, body, {
      type:          payload.type,
      transactionId: payload.transactionId,
      amount:        String(payload.amount),
    });

    return notification;
  }

  // ─── Generic notification ─────────────────────────────────────────────────

  async sendNotification(
    userId: string,
    type: NotificationType,
    title: string,
    body: string,
    metadata?: Record<string, any>,
  ) {
    const notification = await this.prisma.notification.create({
      data: { userId, type, title, body, metadata: metadata as any },
    });

    const basePayload = { id: notification.id, type, title, body, metadata, createdAt: notification.createdAt };
    this.gateway.emitToUser(userId, 'notification', basePayload);

    // Dedicated WS event for bill-due → triggers the in-app popup on any page
    if (type === 'BILL_DUE') {
      this.gateway.emitToUser(userId, 'bill.due', {
        ...basePayload,
        merchantName: metadata?.merchantName,
        merchantSlug: metadata?.merchantSlug,
        amount:       metadata?.amount,
        dueDate:      metadata?.dueDate,
        description:  metadata?.description,
        billId:       metadata?.billId,
      });
    }

    await this.sendFcm(userId, title, body);
    return notification;
  }

  // ─── REST helpers ─────────────────────────────────────────────────────────

  async getNotifications(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where: { userId } }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async markAsRead(notificationId: string, userId: string) {
    const notification = await this.prisma.notification.update({
      where: { id: notificationId, userId },
      data: { readAt: new Date() },
    });
    // Confirm via WS so other open tabs also update
    this.gateway.emitToUser(userId, 'notification.read.ack', {
      notificationId,
      readAt: notification.readAt,
    });
    return notification;
  }

  async markAllAsRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { message: 'All notifications marked as read' };
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({ where: { userId, readAt: null } });
  }

  async updateFcmToken(userId: string, fcmToken: string) {
    return this.prisma.user.update({ where: { id: userId }, data: { fcmToken } });
  }

  // ─── FCM internals ────────────────────────────────────────────────────────

  private async sendFcm(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { fcmToken: true },
    });
    if (!user?.fcmToken) return;

    // single-device send; extend to sendMulticast when you store multiple tokens
    await this.firebase.sendToToken(user.fcmToken, title, body, data);
  }

  // ─── Builders ─────────────────────────────────────────────────────────────

  private buildTitle(p: PaymentNotificationPayload): string {
    const map: Record<PaymentNotificationPayload['type'], string> = {
      PAYMENT_SUCCESS:    'Payment Successful',
      PAYMENT_FAILED:     'Payment Failed',
      SCHEDULE_TRIGGERED: 'Scheduled Payment Triggered',
      SCHEDULE_REMINDER:  'Payment Due Soon',
    };
    return map[p.type] ?? 'PaySmart Notification';
  }

  private buildBody(p: PaymentNotificationPayload): string {
    if (p.type === 'PAYMENT_SUCCESS') {
      return `NPR ${p.amount} sent via ${p.provider} successfully.`;
    }
    if (p.type === 'PAYMENT_FAILED') {
      return `NPR ${p.amount} via ${p.provider} failed. ${p.error ?? ''}`.trim();
    }
    return `NPR ${p.amount} via ${p.provider}`;
  }
}
