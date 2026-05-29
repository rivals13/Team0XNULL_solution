import {
  WebSocketGateway, WebSocketServer, SubscribeMessage,
  OnGatewayConnection, OnGatewayDisconnect,
  ConnectedSocket, MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

// ─── Typed WS events emitted by the server ────────────────────────────────────
export type ServerEvent =
  | 'notification'        // new notification pushed to user
  | 'payment.success'     // real-time payment confirmed
  | 'payment.failed'      // payment failed alert
  | 'balance.low'         // pre-flight balance warning
  | 'schedule.reminder'   // upcoming payment reminder
  | 'pong'                // heartbeat reply
  | 'error';              // any server-side error

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  namespace: '/notifications',
  transports: ['websocket', 'polling'],
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  /** userId → Set of socketIds (supports multiple devices per user) */
  private readonly userSockets = new Map<string, Set<string>>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // ─── Lifecycle ─────────────────────────────────────────────────────────────

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ??
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        client.emit('error', { message: 'Missing auth token' });
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      client.data.userId = payload.sub;
      client.data.role   = payload.role;

      // Track socket per user
      if (!this.userSockets.has(payload.sub)) {
        this.userSockets.set(payload.sub, new Set());
      }
      this.userSockets.get(payload.sub)!.add(client.id);

      client.join(`user:${payload.sub}`);
      this.logger.log(
        `[WS] Connected: ${client.id} (user: ${payload.sub}, ` +
        `devices: ${this.userSockets.get(payload.sub)!.size})`,
      );

      // Confirm connection to client
      client.emit('pong', {
        connected: true,
        userId: payload.sub,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      this.logger.warn(`[WS] Auth failed: ${err.message}`);
      client.emit('error', { message: 'Invalid or expired token' });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId) {
      const sockets = this.userSockets.get(userId);
      sockets?.delete(client.id);
      if (sockets?.size === 0) this.userSockets.delete(userId);
    }
    this.logger.log(`[WS] Disconnected: ${client.id}`);
  }

  // ─── Client → Server message handlers ─────────────────────────────────────

  /** Heartbeat check */
  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    client.emit('pong', { timestamp: new Date().toISOString() });
  }

  /** Client marks a notification as read via WS */
  @SubscribeMessage('notification.read')
  async handleMarkRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { notificationId: string },
  ) {
    this.logger.debug(`[WS] notification.read from ${client.data.userId}: ${body.notificationId}`);
    // Acknowledge back so client knows it landed
    client.emit('notification.read.ack', {
      notificationId: body.notificationId,
      readAt: new Date().toISOString(),
    });
  }

  /** Client subscribes to a specific event channel (e.g. schedule updates) */
  @SubscribeMessage('subscribe')
  handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { channel: string },
  ) {
    client.join(`channel:${body.channel}`);
    this.logger.debug(`[WS] ${client.data.userId} subscribed to channel: ${body.channel}`);
    client.emit('subscribed', { channel: body.channel });
  }

  // ─── Server → Client emitters ──────────────────────────────────────────────

  /** Push to a single user across all their connected devices */
  emitToUser(userId: string, event: ServerEvent | string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
    this.logger.debug(`[WS] emit '${event}' → user ${userId}`);
  }

  /** Push to a named channel */
  emitToChannel(channel: string, event: string, data: any) {
    this.server.to(`channel:${channel}`).emit(event, data);
  }

  /** Broadcast to all connected clients */
  emitToAll(event: string, data: any) {
    this.server.emit(event, data);
  }

  // ─── Stats ─────────────────────────────────────────────────────────────────

  getOnlineUserCount(): number {
    return this.userSockets.size;
  }

  isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId);
  }
}
