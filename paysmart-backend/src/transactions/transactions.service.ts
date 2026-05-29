import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../common/encryption/encryption.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly enc: EncryptionService,
  ) {}

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  /** Decrypt the recipientId field on a transaction row. */
  private decryptTxn<T extends { recipientId?: string | null }>(txn: T): T {
    return {
      ...txn,
      recipientId: txn.recipientId != null ? this.enc.decrypt(txn.recipientId) : txn.recipientId,
    };
  }

  // ─── Write ───────────────────────────────────────────────────────────────────

  async create(userId: string, dto: CreateTransactionDto) {
    // CreateTransactionDto has no recipientId field — that is set by PaymentsService
    // directly. We still decrypt on the way out for consistency.
    const transaction = await this.prisma.transaction.create({ data: { ...dto, userId } });
    this.logger.log(`Transaction created: ${transaction.id} for user: ${userId}`);
    return this.decryptTxn(transaction);
  }

  // ─── Read ─────────────────────────────────────────────────────────────────────

  async findAllByUser(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where:   { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.transaction.count({ where: { userId } }),
    ]);
    return {
      data: data.map(t => this.decryptTxn(t)),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string, userId: string) {
    const txn = await this.prisma.transaction.findFirst({ where: { id, userId } });
    return txn ? this.decryptTxn(txn) : null;
  }

  async syncFromProvider(userId: string, provider: string, transactions: any[]) {
    const ops = transactions.map((txn) => {
      const encryptedTxn = {
        ...txn,
        recipientId: txn.recipientId ? this.enc.encrypt(txn.recipientId) : txn.recipientId,
      };
      return this.prisma.transaction.upsert({
        where:  { externalId: txn.externalId },
        update: { status: txn.status, amount: txn.amount },
        create: { ...encryptedTxn, userId, provider },
      });
    });
    const results = await this.prisma.$transaction(ops);
    return results.map(t => this.decryptTxn(t));
  }
}
