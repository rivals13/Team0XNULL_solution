import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import { HmacService } from '../common/security/hmac.service';

export type WebhookEvent =
  | 'payment.completed'
  | 'payment.failed'
  | 'payment.balance_insufficient'
  | 'schedule.created'
  | 'schedule.paused'
  | 'schedule.cancelled'
  | 'bill.due'
  | 'bill.paid';

interface DeliveryResult {
  appId: string;
  appName: string;
  url: string;
  success: boolean;
  statusCode?: number;
  error?: string;
  attempt: number;
}

const MAX_ATTEMPTS    = 3;
const RETRY_DELAY_MS  = 1_000; // 1s between retries

@Injectable()
export class WebhookDispatcherService {
  private readonly logger = new Logger(WebhookDispatcherService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
    private readonly hmac: HmacService,
  ) {}

  /**
   * Dispatch a webhook event to ALL active registered apps.
   * Each delivery is attempted up to MAX_ATTEMPTS times.
   * Failures are logged but never throw — callers are never blocked.
   */
  async dispatchToAll(event: WebhookEvent, data: Record<string, any>): Promise<DeliveryResult[]> {
    const apps = await this.prisma.registeredApp.findMany({
      where: { isActive: true, webhookUrl: { not: null } },
    });

    if (apps.length === 0) return [];

    this.logger.log(`[Webhook] Dispatching '${event}' to ${apps.length} app(s)`);

    const results = await Promise.allSettled(
      apps.map((app) => this.deliverWithRetry(app, event, data)),
    );

    return results.map((r) =>
      r.status === 'fulfilled' ? r.value : { appId: '', appName: '', url: '', success: false, error: r.reason, attempt: 0 },
    );
  }

  /**
   * Dispatch to a single specific app (used for testing / admin triggers).
   */
  async dispatchToApp(appId: string, event: WebhookEvent, data: Record<string, any>): Promise<DeliveryResult> {
    const app = await this.prisma.registeredApp.findUnique({ where: { id: appId } });
    if (!app || !app.webhookUrl) {
      return { appId, appName: '', url: '', success: false, error: 'App not found or no URL', attempt: 0 };
    }
    return this.deliverWithRetry(app, event, data);
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  private async deliverWithRetry(
    app: { id: string; name: string; webhookUrl: string | null; webhookSecret: string },
    event: string,
    data: Record<string, any>,
  ): Promise<DeliveryResult> {
    const url = app.webhookUrl!;
    const body = JSON.stringify({ event, data, timestamp: new Date().toISOString() });
    // Sign with per-app secret so recipients can verify authenticity
    const signature = this.hmac.signWithSecret(body, app.webhookSecret);

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const response = await firstValueFrom(
          this.httpService.post(url, body, {
            headers: {
              'Content-Type': 'application/json',
              'X-PaySmart-Event':     event,
              'X-PaySmart-Signature': signature,
              'X-PaySmart-Attempt':   String(attempt),
            },
            timeout: 8_000,
          }),
        );

        this.logger.log(
          `[Webhook] ✓ Delivered '${event}' to '${app.name}' (attempt ${attempt}) — HTTP ${response.status}`,
        );

        // Mark event as processed in DB
        await this.prisma.webhookEvent.create({
          data: {
            provider: app.id,
            eventType: event,
            payload: { event, data } as any,
            processed: true,
          },
        }).catch(() => {}); // non-blocking

        return { appId: app.id, appName: app.name, url, success: true, statusCode: response.status, attempt };
      } catch (err) {
        const status = err?.response?.status;
        this.logger.warn(
          `[Webhook] ✗ '${event}' to '${app.name}' attempt ${attempt}/${MAX_ATTEMPTS} ` +
          `— ${status ? `HTTP ${status}` : err.message}`,
        );

        if (attempt < MAX_ATTEMPTS) {
          await this.delay(RETRY_DELAY_MS * attempt); // 1s, 2s
        } else {
          // Log permanent failure
          await this.prisma.webhookEvent.create({
            data: {
              provider: app.id,
              eventType: event,
              payload: { event, data, error: err.message } as any,
              processed: false,
            },
          }).catch(() => {});

          return {
            appId: app.id,
            appName: app.name,
            url,
            success: false,
            statusCode: status,
            error: err.message,
            attempt,
          };
        }
      }
    }

    return { appId: app.id, appName: app.name, url, success: false, error: 'Max retries exceeded', attempt: MAX_ATTEMPTS };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
