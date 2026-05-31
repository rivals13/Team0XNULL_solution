export type UserRole = 'USER' | 'MERCHANT' | 'ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  isActive: boolean;
  isVerified: boolean;
  avatarUrl?: string;
  fcmToken?: string;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  otpSent?: boolean;
}

export type TransactionStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'REFUNDED';
export type TransactionType = 'DEBIT' | 'CREDIT';

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  type: TransactionType;
  status: TransactionStatus;
  provider?: string;
  recipientId?: string;
  description?: string;
  externalId?: string;
  failureReason?: string;
  completedAt?: string;
  createdAt: string;
}

export type ScheduleFreq = 'ONCE' | 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'CUSTOM_CRON';
export type ScheduleStatus = 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'COMPLETED';

export interface Schedule {
  id: string;
  userId: string;
  billerAccountId?: string;  // set when schedule was created from a biller account
  name: string;
  amount: number;
  provider: string;
  recipientId: string;
  frequency: ScheduleFreq;
  status: ScheduleStatus;
  nextRunAt: string;
  lastRunAt?: string;
  endDate?: string;
  description?: string;
  maxOccurrences: number;   // 0 = unlimited
  executedCount:  number;
  createdAt: string;
}

export type BillStatus = 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED' | 'DISPUTED';

export interface Bill {
  id: string;
  userId: string;
  merchantId: string;
  billerAccountId?: string;
  amount: number;
  dueDate: string;
  billingPeriod?: string;
  status: BillStatus;
  description?: string;
  paidAt?: string;
  createdAt: string;
  user?: { id: string; name: string; phone?: string };
  merchant?: { id: string; name: string; category: string };
}

export type NotificationType =
  | 'BILL_DUE' | 'BILL_PAID' | 'PAYMENT_SUCCESS' | 'PAYMENT_FAILED'
  | 'SCHEDULE_REMINDER' | 'SCHEDULE_TRIGGERED' | 'NEW_SUGGESTION' | 'SYSTEM';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
  readAt?: string;
  createdAt: string;
}

export type SuggestionType =
  | 'BILL_REMINDER' | 'PAYMENT_SUGGESTION' | 'SCHEDULE_RECOMMENDATION' | 'SPENDING_INSIGHT' | 'SAVINGS_TIP';
export type SuggestionStatus = 'PENDING' | 'ACCEPTED' | 'DISMISSED' | 'EXPIRED';

export interface Suggestion {
  id: string;
  userId: string;
  type: SuggestionType;
  title: string;
  body: string;
  status: SuggestionStatus;
  metadata?: { confidence?: number; payee?: string; avg_amount?: number; frequency?: string; action?: string };
  expiresAt?: string;
  createdAt: string;
}

export interface HealthScore {
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  breakdown: {
    on_time_payments: number;
    missed_payments: number;
    avg_balance_maintained: number;
    on_time_contribution: number;
    missed_penalty: number;
    balance_score: number;
  };
  insight: string;
  calculatedAt: string;
}

export interface Paginated<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface PaymentJob {
  jobId: string;
  status: string;
  state?: string;
  progress?: number;
  attempts?: number;
  failedReason?: string;
}

export interface BankAccount {
  bankName:      string;
  accountNumber: string;
  accountHolder: string;
  branchCode?:   string;
}

export interface MerchantPaymentMethods {
  esewa?:  string;   // eSewa-registered phone number
  khalti?: string;   // Khalti-registered phone number
  banks?:  BankAccount[];
}

export interface Merchant {
  id: string;
  name: string;
  slug: string;
  category: string;
  description?: string;
  website?: string;
  isActive: boolean;
  createdAt: string;
  apiKey?: string;
  paymentMethods?: MerchantPaymentMethods;
}

// ── Biller Accounts (NEA SC No., KUKL client code, traffic chit, school ID …) ─
export interface BillerAccount {
  id: string;
  billerName: string;     // e.g. "NEA Electricity"
  billerSlug: string;     // e.g. "nea-electricity"
  billerCategory: string; // ELECTRICITY | WATER | EDUCATION | TRAFFIC | …
  customerId: string;     // SC No. / Chit No. / Student ID / Client Code
  details: Record<string, unknown>; // officeCode, fiscalYear, province, etc.
  isDefault: boolean;
  isVerified: boolean;
  createdAt: string;
  merchant: { id: string; name: string; slug: string; category: string };
}

// Onboarding category meta (used for the service-grid step)
export type BillerCategory =
  | 'electricity' | 'water' | 'education' | 'traffic'
  | 'internet' | 'tv' | 'rent' | 'insurance' | 'school' | 'college' | 'other';

// ── Fetched Bill (mock real-time bill from NEA / KUKL / ISP / TV APIs) ────────
export interface FetchedBill {
  accountId: string;
  currentAmount: number;
  fine: number;
  rebate: number;
  serviceCharge: number;
  dueDate: string;
  billPeriod: string;
  unitsUsed?: number;   // kWh for electricity
  planName?: string;    // for internet / tv packages
  status: 'DUE' | 'OVERDUE' | 'PAID';
  fetchedAt: string;
}

// ── Payment provider options ──────────────────────────────────────────────────
export type PaymentProvider = 'ESEWA' | 'KHALTI' | 'WALLET';

// ── Schedule preferences (user opt-in) ───────────────────────────────────────
export interface SchedulePrefs {
  autoPayEnabled: boolean;
  smsReminder: boolean;
  pushNotification: boolean;
}
