import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../common/encryption/encryption.service';

// ─── Health-score constants ───────────────────────────────────────────────────
const ON_TIME_WEIGHT   = 2;    // points per on-time payment
const MISSED_WEIGHT    = 3;    // points deducted per missed payment
const MAX_BALANCE_PTS  = 20;   // balance component caps at 20 pts
const BALANCE_SCALE    = 25_000; // NPR avg amount that earns full 20 pts
const SCORE_BASE       = 50;   // neutral baseline so a brand-new user starts at 50

export interface HealthScoreBreakdown {
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  breakdown: {
    on_time_payments:     number;
    missed_payments:      number;
    avg_balance_maintained: number;
    on_time_contribution: number;
    missed_penalty:       number;
    balance_score:        number;
  };
  insight: string;
  calculatedAt: string;
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly enc: EncryptionService,
  ) {}

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  /** Decrypt email and phone on a fetched user row. */
  private decryptUser<T extends { email: string; phone?: string | null }>(user: T): T {
    return {
      ...user,
      email: this.enc.decrypt(user.email),
      phone: user.phone != null ? this.enc.decrypt(user.phone) : user.phone,
    };
  }

  // ─── CRUD ─────────────────────────────────────────────────────────────────────

  async create(data: {
    name: string;
    email: string;
    phone?: string;
    password: string;
    role?: UserRole;
  }) {
    const encryptedData = {
      ...data,
      email: this.enc.encrypt(data.email),
      phone: data.phone ? this.enc.encrypt(data.phone) : undefined,
    };
    const user = await this.prisma.user.create({ data: encryptedData });
    // Return with decrypted values so callers always see plaintext
    return this.decryptUser(user);
  }

  /**
   * Lookup by email.
   * Because email is stored encrypted with a random IV, we cannot use a WHERE
   * clause — we scan all rows and decrypt to find a match.
   * (Acceptable for demo scale; production would use a blind-index column.)
   */
  async findByEmail(email: string) {
    const users = await this.prisma.user.findMany();
    const match = users.find(u => this.enc.decrypt(u.email) === email);
    return match ? this.decryptUser(match) : null;
  }

  /**
   * Lookup by phone (same blind-scan approach as findByEmail).
   */
  async findByPhone(phone: string) {
    const users = await this.prisma.user.findMany({
      select: { id: true, phone: true },
    });
    const match = users.find(u => u.phone != null && this.enc.decrypt(u.phone) === phone);
    return match ? { id: match.id, phone: this.enc.decrypt(match.phone!) } : null;
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatarUrl: true,
        role: true,
        isActive: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return this.decryptUser(user);
  }

  async findAll() {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatarUrl: true,
        role: true,
        isActive: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return users.map(u => this.decryptUser(u));
  }

  async updateFcmToken(userId: string, fcmToken: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { fcmToken },
    });
  }

  // ─── Health Score ─────────────────────────────────────────────────────────────

  async getHealthScore(userId: string): Promise<HealthScoreBreakdown> {
    // Verify user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) throw new NotFoundException('User not found');

    // ── Parallel data fetch ───────────────────────────────────────────────
    const [paidBills, overdueBills, failedTxns, completedTxns] = await Promise.all([
      // Bills that were actually paid
      this.prisma.bill.findMany({
        where:  { userId, status: 'PAID', paidAt: { not: null } },
        select: { paidAt: true, dueDate: true },
      }),
      // Bills that are currently overdue
      this.prisma.bill.count({
        where: { userId, status: 'OVERDUE' },
      }),
      // Failed / not recovered transactions
      this.prisma.transaction.count({
        where: { userId, status: 'FAILED' },
      }),
      // Completed transactions for average-amount proxy
      this.prisma.transaction.findMany({
        where:   { userId, status: 'COMPLETED' },
        select:  { amount: true },
        orderBy: { createdAt: 'desc' },
        take:    50,
      }),
    ]);

    // ── on_time_payments: paid before or on the due date ──────────────────
    const onTimePayments = paidBills.filter(
      (b) => b.paidAt !== null && b.paidAt <= b.dueDate,
    ).length;

    // ── missed_payments: overdue bills + terminal-failed transactions ─────
    const missedPayments = overdueBills + failedTxns;

    // ── avg_balance_maintained: average completed-transaction amount ───────
    const avgBalance =
      completedTxns.length > 0
        ? completedTxns.reduce((sum, t) => sum + t.amount, 0) / completedTxns.length
        : 0;

    // ── Score components ──────────────────────────────────────────────────
    const onTimeContribution = onTimePayments * ON_TIME_WEIGHT;
    const missedPenalty      = missedPayments * MISSED_WEIGHT;
    const balanceScore       = Math.min(
      Math.round((avgBalance / BALANCE_SCALE) * MAX_BALANCE_PTS),
      MAX_BALANCE_PTS,
    );

    const raw   = SCORE_BASE + onTimeContribution - missedPenalty + balanceScore;
    const score = Math.max(0, Math.min(100, raw));

    const grade = this.toGrade(score);

    return {
      score,
      grade,
      breakdown: {
        on_time_payments:       onTimePayments,
        missed_payments:        missedPayments,
        avg_balance_maintained: Math.round(avgBalance),
        on_time_contribution:   onTimeContribution,
        missed_penalty:         -missedPenalty,
        balance_score:          balanceScore,
      },
      insight: this.buildInsight(score, onTimePayments, missedPayments),
      calculatedAt: new Date().toISOString(),
    };
  }

  // ─── GET bills for student ────────────────────────────────────────────────────

  async getBillsForUser(userId: string) {
    return this.prisma.bill.findMany({
      where: {
        userId,
        status: { in: ['PENDING', 'OVERDUE'] },
      },
      include: {
        merchant: { select: { id: true, name: true, category: true } },
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  private toGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 80) return 'A';
    if (score >= 60) return 'B';
    if (score >= 40) return 'C';
    if (score >= 20) return 'D';
    return 'F';
  }

  private buildInsight(score: number, onTime: number, missed: number): string {
    if (missed === 0 && onTime >= 5) return 'Excellent payment discipline! Keep it up.';
    if (missed === 0) return 'No missed payments — start building a longer track record.';
    if (score >= 70) return 'Good overall, but reducing missed payments will push you higher.';
    if (score >= 40) return 'Consider automating recurring bills to avoid late payments.';
    return 'Multiple missed payments detected — automate your bills to improve your score.';
  }
}
