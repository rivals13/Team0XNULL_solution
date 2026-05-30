import {
  Injectable,
  ConflictException, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { SecureLoggerService } from '../common/logger/secure-logger.service';
import { EncryptionService } from '../common/encryption/encryption.service';
import { BillStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RegisterMerchantDto, UpdatePaymentMethodsDto } from './dto/register-merchant.dto';
import { PushBillDto } from './dto/push-bill.dto';

export interface PaymentMethods {
  esewa?:  string;                      // eSewa-registered phone
  khalti?: string;                      // Khalti-registered phone
  banks?:  Array<{
    bankName:      string;
    accountNumber: string;
    accountHolder: string;
    branchCode?:   string;
  }>;
}

@Injectable()
export class MerchantService {
  private readonly logger = new SecureLoggerService(MerchantService.name);

  constructor(
    private readonly prisma:         PrismaService,
    private readonly notifications:  NotificationsService,
    private readonly enc:            EncryptionService,
  ) {}

  // ─── POST /merchant/register (ADMIN only) ────────────────────────────────

  async register(dto: RegisterMerchantDto) {
    const slugTaken = await this.prisma.merchant.findUnique({ where: { slug: dto.slug } });
    if (slugTaken) throw new ConflictException(`Slug "${dto.slug}" is already taken.`);

    const paymentMethods: PaymentMethods = {};
    if (dto.esewaId)      paymentMethods.esewa  = dto.esewaId;
    if (dto.khaltiId)     paymentMethods.khalti = dto.khaltiId;
    if (dto.bankAccounts?.length) paymentMethods.banks = dto.bankAccounts;

    // Encrypt billInquiryApiKey if provided
    let encryptedApiKey: string | undefined;
    if (dto.billInquiryApiKey) {
      encryptedApiKey = this.enc.encrypt(dto.billInquiryApiKey);
    }

    const merchant = await this.prisma.merchant.create({
      data: {
        name:             dto.name,
        slug:             dto.slug,
        category:         dto.category,
        description:      dto.description,
        website:          dto.website,
        billInquiryUrl:   dto.billInquiryUrl,
        billInquiryApiKey: encryptedApiKey,
        paymentMethods:   Object.keys(paymentMethods).length ? (paymentMethods as object) : undefined,
      },
    });

    this.logger.log(`[Merchant] Registered "${merchant.name}" (id: ${merchant.id})`);

    return {
      id:             merchant.id,
      name:           merchant.name,
      slug:           merchant.slug,
      category:       merchant.category,
      apiKey:         merchant.apiKey,
      paymentMethods: merchant.paymentMethods,
      message:        'Store this API key securely — it will not be shown again.',
      createdAt:      merchant.createdAt,
    };
  }

  // ─── PATCH /merchant/payment-methods (merchant API key) ──────────────────

  async updatePaymentMethods(merchantId: string, dto: UpdatePaymentMethodsDto) {
    const current = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
      select: { paymentMethods: true },
    });
    if (!current) throw new NotFoundException('Merchant not found.');

    const existing = (current.paymentMethods as PaymentMethods | null) ?? {};
    const updated: PaymentMethods = {
      esewa:  dto.esewaId      ?? existing.esewa,
      khalti: dto.khaltiId     ?? existing.khalti,
      banks:  dto.bankAccounts ?? existing.banks,
    };
    // Remove undefined keys
    if (!updated.esewa)          delete updated.esewa;
    if (!updated.khalti)         delete updated.khalti;
    if (!updated.banks?.length)  delete updated.banks;

    const merchant = await this.prisma.merchant.update({
      where: { id: merchantId },
      data:  { paymentMethods: updated as object },
      select: { id: true, name: true, paymentMethods: true },
    });

    this.logger.log(`[Merchant] Payment methods updated for "${merchant.name}"`);
    return merchant;
  }

  // ─── POST /merchant/push-bill ────────────────────────────────────────────

  async pushBill(merchantId: string, merchantName: string, dto: PushBillDto) {
    const normalizedPhone = this.normalizePhone(dto.student_phone);

    // Phone is stored encrypted — scan all users and decrypt to find a match
    const allUsers = await this.prisma.user.findMany({
      select: { id: true, phone: true },
    });
    const student = allUsers.find(
      u => u.phone != null && this.enc.decrypt(u.phone) === normalizedPhone,
    ) ?? null;
    if (!student) {
      throw new NotFoundException(
        `No PaySmart user found with phone ${dto.student_phone}. ` +
        'Ask the student to register and add their phone number.',
      );
    }

    const dueDate = new Date(dto.due_date);
    if (isNaN(dueDate.getTime()))
      throw new BadRequestException('Invalid due_date — must be a valid ISO 8601 date');

    const bill = await this.prisma.bill.create({
      data: {
        userId:      student.id,
        merchantId,
        amount:      dto.amount,
        dueDate,
        status:      BillStatus.PENDING,
        description: dto.description ?? `Bill from ${merchantName}`,
      },
    });

    // ── Fetch merchant payment methods to embed in notification ──────────
    const merchant = await this.prisma.merchant.findUnique({
      where:  { id: merchantId },
      select: { paymentMethods: true },
    });
    const paymentMethods = (merchant?.paymentMethods as PaymentMethods | null) ?? {};

    const daysUntil = Math.ceil((dueDate.getTime() - Date.now()) / 86_400_000);
    const dueLine   = daysUntil <= 0
      ? 'due today'
      : `due in ${daysUntil} day${daysUntil > 1 ? 's' : ''}`;

    // ── Send BILL_DUE notification with full payment info ─────────────────
    this.notifications.sendNotification(
      student.id,
      'BILL_DUE',
      `New bill from ${merchantName}`,
      `NPR ${dto.amount.toFixed(2)} ${dueLine}. ${dto.description ?? ''}`.trim(),
      {
        merchantId,
        merchantName,
        billId:   bill.id,
        amount:   dto.amount,
        dueDate:  dueDate.toISOString(),
        // Payment methods — shown locked to student
        esewaId:  paymentMethods.esewa  ?? null,
        khaltiId: paymentMethods.khalti ?? null,
        banks:    paymentMethods.banks  ?? [],
      },
    );

    this.logger.log(`[Merchant] Bill ${bill.id} pushed by ${merchantId} → student ${student.id} (phone: ${this.logger.sanitize(normalizedPhone)})`);

    return {
      billId:         bill.id,
      studentId:      student.id,
      merchantId,
      amount:         bill.amount,
      dueDate:        bill.dueDate,
      status:         bill.status,
      description:    bill.description,
      paymentMethods: paymentMethods,
      createdAt:      bill.createdAt,
    };
  }

  // ─── GET /merchant/bills ─────────────────────────────────────────────────

  async getBills(merchantId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.bill.findMany({
        where:   { merchantId },
        orderBy: { createdAt: 'desc' },
        skip,
        take:    limit,
        select: {
          id: true, amount: true, dueDate: true, status: true,
          description: true, createdAt: true, paidAt: true,
          user: { select: { id: true, name: true, phone: true } },
        },
      }),
      this.prisma.bill.count({ where: { merchantId } }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  // ─── GET /merchant/profile ───────────────────────────────────────────────

  async getProfileById(merchantId: string) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
      select: {
        id: true, name: true, slug: true, category: true,
        description: true, website: true, isActive: true,
        paymentMethods: true,
        createdAt: true,
        _count: { select: { bills: true } },
      },
    });
    if (!merchant) throw new NotFoundException('Merchant not found.');
    return merchant;
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private normalizePhone(phone: string): string {
    let p = phone.trim().replace(/\s+/g, '');
    if (p.startsWith('+977')) p = p.slice(4);
    else if (p.startsWith('977')) p = p.slice(3);
    if (p.startsWith('0')) p = p.slice(1);
    return p;
  }
}
