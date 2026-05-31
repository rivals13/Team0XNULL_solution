import client from './client';
import type {
  AuthResponse, User, Paginated,
  Transaction, Schedule, Bill, Notification,
  Suggestion, HealthScore, PaymentJob, Merchant,
  BillerAccount,
} from '../types';

// ── Auth ────────────────────────────────────────────────────────────────────
export const authApi = {
  register: (body: { name: string; email: string; phone?: string; password: string }) =>
    client.post<AuthResponse>('/auth/register', body).then(r => r.data),

  login: (body: { email: string; password: string }) =>
    client.post<AuthResponse>('/auth/login', body).then(r => r.data),

  refresh: (refreshToken: string) =>
    client.post<{ accessToken: string; refreshToken: string }>('/auth/refresh', { refreshToken }).then(r => r.data),

  logout: () => client.post('/auth/logout'),

  me: () => client.get<User>('/auth/me').then(r => r.data),
};

export interface UserPreferences {
  autoPayEnabled:   boolean;
  smsReminder:      boolean;
  pushNotification: boolean;
  partialPayment:   boolean;
}

// ── Users ───────────────────────────────────────────────────────────────────
export const usersApi = {
  getHealthScore: (userId: string) =>
    client.get<HealthScore>(`/users/health-score/${userId}`).then(r => r.data),

  getById: (id: string) =>
    client.get<User>(`/users/${id}`).then(r => r.data),

  getMyBills: () =>
    client.get<Bill[]>('/users/bills/my').then(r => r.data),

  getPreferences: () =>
    client.get<UserPreferences>('/users/preferences').then(r => r.data),

  updatePreferences: (patch: Partial<UserPreferences>) =>
    client.patch<UserPreferences>('/users/preferences', patch).then(r => r.data),
};

// ── Transactions ────────────────────────────────────────────────────────────
export const transactionsApi = {
  list: (page = 1, limit = 20) =>
    client.get<Paginated<Transaction>>('/transactions', { params: { page, limit } }).then(r => r.data),

  get: (id: string) =>
    client.get<Transaction>(`/transactions/${id}`).then(r => r.data),
};

// ── Payments ────────────────────────────────────────────────────────────────
export const paymentsApi = {
  execute: (body: { amount: number; provider: string; recipientId: string; description?: string; billId?: string; scheduleId?: string }) =>
    client.post<Transaction>('/payments/execute', body).then(r => r.data),

  queue: (body: { amount: number; provider: string; recipientId: string; description?: string }) =>
    client.post<PaymentJob>('/payments/queue', body).then(r => r.data),

  jobStatus: (jobId: string) =>
    client.get<PaymentJob>(`/payments/jobs/${jobId}`).then(r => r.data),

  getBalance: () =>
    client.get<{ balance: number }>('/payments/balance').then(r => r.data),
};

// ── Schedules ───────────────────────────────────────────────────────────────
export const schedulesApi = {
  list: () => client.get<Schedule[]>('/schedules').then(r => r.data),

  create: (body: {
    name: string; amount: number; provider: string; recipientId: string;
    frequency: string; nextRunAt: string; description?: string; cronExpression?: string; endDate?: string;
  }) => client.post<Schedule>('/schedules', body).then(r => r.data),

  get: (id: string) => client.get<Schedule>(`/schedules/${id}`).then(r => r.data),

  update: (id: string, body: {
    name?: string; amount?: number; recipientId?: string;
    frequency?: string; nextRunAt?: string; description?: string; maxOccurrences?: number;
  }) => client.patch<Schedule>(`/schedules/${id}`, body).then(r => r.data),

  pause: (id: string) => client.patch<Schedule>(`/schedules/${id}/pause`).then(r => r.data),

  resume: (id: string) => client.patch<Schedule>(`/schedules/${id}/resume`).then(r => r.data),

  cancel: (id: string) => client.delete(`/schedules/${id}`),
};

// ── Notifications ───────────────────────────────────────────────────────────
export const notificationsApi = {
  list: (page = 1, limit = 20) =>
    client.get<Paginated<Notification>>('/notifications', { params: { page, limit } }).then(r => r.data),

  unreadCount: () =>
    client.get<{ count: number }>('/notifications/unread-count').then(r => r.data),

  markRead: (id: string) =>
    client.patch(`/notifications/${id}/read`),

  markAllRead: () =>
    client.patch('/notifications/read-all'),

  registerFcmToken: (fcmToken: string) =>
    client.post('/notifications/fcm-token', { fcmToken }),
};

// ── Sync / Suggestions ──────────────────────────────────────────────────────
export const syncApi = {
  syncEsewa: () =>
    client.post('/sync/esewa').then(r => r.data),

  getSuggestions: () =>
    client.get<Suggestion[]>('/sync/suggestions').then(r => r.data),
};

// ── Merchant ────────────────────────────────────────────────────────────────
export const merchantApi = {
  // Uses X-API-Key header
  pushBill: (apiKey: string, body: { student_phone: string; amount: number; due_date: string; description?: string }) =>
    client.post('/merchant/push-bill', body, { headers: { 'X-API-Key': apiKey } }).then(r => r.data),

  getBills: (apiKey: string, page = 1, limit = 20) =>
    client.get<Paginated<Bill>>('/merchant/bills', {
      headers: { 'X-API-Key': apiKey },
      params: { page, limit },
    }).then(r => r.data),

  getProfile: (apiKey: string) =>
    client.get<Merchant>('/merchant/profile', { headers: { 'X-API-Key': apiKey } }).then(r => r.data),

  updatePaymentMethods: (apiKey: string, body: {
    esewaId?: string; khaltiId?: string;
    bankAccounts?: Array<{ bankName: string; accountNumber: string; accountHolder: string; branchCode?: string }>;
  }) =>
    client.patch<Merchant>('/merchant/payment-methods', body, { headers: { 'X-API-Key': apiKey } }).then(r => r.data),

  // Admin only
  register: (body: {
    name: string; slug: string; category: string; description?: string; website?: string;
    esewaId?: string; khaltiId?: string;
    bankAccounts?: Array<{ bankName: string; accountNumber: string; accountHolder: string; branchCode?: string }>;
  }) =>
    client.post<Merchant>('/merchant/register', body).then(r => r.data),
};

// ── OTP ────────────────────────────────────────────────────────────────────
export const otpApi = {
  send: (phone: string) => client.post('/sms/otp/send', { phone }),
  verify: (phone: string, otp: string) => client.post('/sms/otp/verify', { phone, otp }),
};

// ── Biller Accounts (saved utility/service accounts) ────────────────────────
export const billerAccountsApi = {
  list: () =>
    client.get<BillerAccount[]>('/biller-accounts').then(r => r.data),

  create: (body: {
    billerName: string;
    billerSlug: string;
    billerCategory: string;
    customerId: string;
    details?: Record<string, unknown>;
    nickname?: string;
    isDefault?: boolean;
  }) => client.post<BillerAccount>('/biller-accounts', body).then(r => r.data),

  remove: (id: string) =>
    client.delete(`/biller-accounts/${id}`).then(r => r.data),

  checkBill: (id: string) =>
    client.post(`/biller-accounts/${id}/check-bill`).then(r => r.data),

  /** Update internet package and persist to encrypted details */
  updatePackage: (id: string, pkg: string, packagePrice: number) =>
    client.patch(`/biller-accounts/${id}/package`, { package: pkg, packagePrice }).then(r => r.data),
};

// ── Mock Merchant actions ────────────────────────────────────────────────────
export const mockMerchantApi = {
  /** Notify mock merchant of a customer action (SAVED / PAY_NOW / SCHEDULED) */
  customerAction: (
    slug: string,
    data: { customerId: string; action: 'SAVED' | 'PAY_NOW' | 'SCHEDULED'; amount?: number; scheduledDate?: string },
  ) => client.post<{ received: boolean; hasDue: boolean; amount?: number; dueDate?: string; message?: string }>(
    `/mock-merchant/${slug}/customer-action`, data,
  ).then(r => r.data).catch(() => null),
};

// ── Bill Inquiry (validate customer ID without saving an account) ─────────────
export const billInquiryApi = {
  /**
   * Validates a customer ID against the merchant's bill-inquiry API.
   * Does NOT require an existing biller account.
   * Returns { valid: true, bill: {...} } or { valid: false, reason: string }
   */
  validate: (merchantSlug: string, customerId: string) =>
    client.get<{ valid: boolean; reason?: string; bill?: Record<string, unknown> }>(
      '/bill-inquiry/validate',
      { params: { merchantSlug, customerId } },
    ).then(r => r.data),
};

// ── Merchant list / public details ──────────────────────────────────────────
export const merchantListApi = {
  /** All active merchants — name, slug, category, eSewa ID, hasBillInquiry */
  list: () =>
    client.get<Array<{
      id: string; name: string; slug: string; category: string;
      description: string; esewaId: string | null;
      hasBillInquiry: boolean; totalAccounts: number;
    }>>('/merchant/list').then(r => r.data),

  /** Public merchant details by slug — eSewa ID + bank accounts (no auth required) */
  getBySlug: (slug: string) =>
    client.get<{
      id: string; name: string; slug: string; category: string;
      esewaId: string | null;
      banks: Array<{ bankName: string; accountNumber: string; accountHolder: string; branchCode?: string }>;
    }>(`/merchant/by-slug/${slug}`).then(r => r.data),
};
