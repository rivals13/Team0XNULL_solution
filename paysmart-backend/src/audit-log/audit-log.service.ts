import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditLogEntry {
  userId: string;
  action: string;
  dataType: string;
  ipAddress?: string;
  success?: boolean;
  metadata?: Record<string, any>;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Record a data access event.
   * IP is stored with the last octet masked: 192.168.1.55 → 192.168.1.0
   * This is a fire-and-forget write — failures are logged but never thrown.
   */
  async log(entry: AuditLogEntry): Promise<void> {
    try {
      await this.prisma.dataAccessLog.create({
        data: {
          userId: entry.userId,
          action: entry.action,
          dataType: entry.dataType,
          ipAddress: entry.ipAddress ? this.maskIp(entry.ipAddress) : null,
          success: entry.success ?? true,
          metadata: entry.metadata ?? null,
        },
      });
    } catch (err) {
      // Never let audit log failures surface to the caller
      this.logger.error(
        `[AuditLog] Failed to write log entry for user ${entry.userId}: ${err.message}`,
      );
    }
  }

  /**
   * Fetch audit log entries for a user (most recent first).
   */
  async getLogsForUser(userId: string, limit = 50) {
    return this.prisma.dataAccessLog.findMany({
      where: { userId },
      orderBy: { accessedAt: 'desc' },
      take: limit,
      select: {
        id: true,
        action: true,
        dataType: true,
        ipAddress: true,
        success: true,
        accessedAt: true,
        metadata: true,
      },
    });
  }

  /**
   * Convenience: log a successful eSewa data read.
   */
  async logEsewaRead(userId: string, dataType: string, ipAddress?: string) {
    return this.log({ userId, action: 'ESEWA_READ', dataType, ipAddress });
  }

  /**
   * Convenience: log a failed eSewa access attempt.
   */
  async logEsewaAccessDenied(userId: string, reason: string, ipAddress?: string) {
    return this.log({
      userId,
      action: 'ESEWA_ACCESS_DENIED',
      dataType: 'esewa',
      ipAddress,
      success: false,
      metadata: { reason },
    });
  }

  /**
   * Mask the last octet of IPv4. Handles IPv6 gracefully.
   */
  private maskIp(ip: string): string {
    const ipv4Parts = ip.split('.');
    if (ipv4Parts.length === 4) {
      ipv4Parts[3] = '0';
      return ipv4Parts.join('.');
    }
    // IPv6 — truncate after last colon group
    const colonIdx = ip.lastIndexOf(':');
    if (colonIdx !== -1) return ip.substring(0, colonIdx + 1) + '0';
    return ip.substring(0, 20);
  }
}
