import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);
  private initialized = false;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const projectId   = this.configService.get<string>('FIREBASE_PROJECT_ID');
    const privateKey  = this.configService.get<string>('FIREBASE_PRIVATE_KEY');
    const clientEmail = this.configService.get<string>('FIREBASE_CLIENT_EMAIL');

    if (!projectId || !privateKey || !clientEmail) {
      this.logger.warn('[Firebase] Credentials not set — FCM push disabled (dev mode)');
      return;
    }

    if (admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          privateKey: privateKey.replace(/\\n/g, '\n'),
          clientEmail,
        }),
      });
      this.initialized = true;
      this.logger.log('[Firebase] Admin SDK initialized');
    } else {
      this.initialized = true;
    }
  }

  /**
   * Send to a single FCM token.
   * Silently skips if Firebase is not configured.
   */
  async sendToToken(
    token: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void> {
    if (!this.initialized || !token) return;
    try {
      await admin.messaging().send({
        token,
        notification: { title, body },
        data,
        android: { priority: 'high' },
        apns: { payload: { aps: { sound: 'default', badge: 1 } } },
      });
      this.logger.debug(`[FCM] Sent to ${token.slice(0, 12)}…`);
    } catch (err) {
      this.logger.warn(`[FCM] Single send failed: ${err.message}`);
    }
  }

  /**
   * Send to multiple FCM tokens at once (multicast).
   * Returns { successCount, failureCount }.
   */
  async sendMulticast(
    tokens: string[],
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<{ successCount: number; failureCount: number }> {
    if (!this.initialized || tokens.length === 0) {
      return { successCount: 0, failureCount: 0 };
    }

    try {
      const response = await admin.messaging().sendEachForMulticast({
        tokens,
        notification: { title, body },
        data,
        android: { priority: 'high' },
        apns: { payload: { aps: { sound: 'default', badge: 1 } } },
      });

      this.logger.log(
        `[FCM] Multicast — success: ${response.successCount}, failed: ${response.failureCount}`,
      );

      // Log individual failures for debugging
      response.responses.forEach((r, i) => {
        if (!r.success) {
          this.logger.warn(`[FCM] Token[${i}] failed: ${r.error?.message}`);
        }
      });

      return {
        successCount: response.successCount,
        failureCount: response.failureCount,
      };
    } catch (err) {
      this.logger.error(`[FCM] Multicast failed: ${err.message}`);
      return { successCount: 0, failureCount: tokens.length };
    }
  }

  /**
   * Send to a topic (e.g. broadcast to all users subscribed to 'alerts').
   */
  async sendToTopic(
    topic: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void> {
    if (!this.initialized) return;
    try {
      await admin.messaging().send({
        topic,
        notification: { title, body },
        data,
        android: { priority: 'high' },
      });
      this.logger.debug(`[FCM] Sent to topic: ${topic}`);
    } catch (err) {
      this.logger.warn(`[FCM] Topic send failed: ${err.message}`);
    }
  }

  get isReady(): boolean {
    return this.initialized;
  }
}
