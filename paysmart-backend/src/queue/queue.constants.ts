// ─── Queue names ──────────────────────────────────────────────────────────────
export const PAYMENT_QUEUE      = 'payment-queue';
export const SCHEDULE_QUEUE     = 'schedule-queue';
export const BILLER_POLL_QUEUE  = 'biller-poll-queue';

// ─── PAYMENT_QUEUE job types ──────────────────────────────────────────────────
export const EXECUTE_PAYMENT_JOB   = 'execute-payment';
export const RETRY_PAYMENT_JOB     = 'retry-payment';
export const SYNC_TRANSACTIONS_JOB = 'sync-transactions';

// ─── SCHEDULE_QUEUE job types ─────────────────────────────────────────────────
export const BALANCE_CHECK_DAY_JOB  = 'balance-check-1day';
export const BALANCE_CHECK_HOUR_JOB = 'balance-check-1hour';

// ─── BILLER_POLL_QUEUE job types ──────────────────────────────────────────────
export const POLL_ALL_BILLERS_JOB = 'poll-all-billers';

// ─── Timing helpers (ms) ──────────────────────────────────────────────────────
export const ONE_DAY_MS  = 24 * 60 * 60 * 1000;
export const ONE_HOUR_MS =      60 * 60 * 1000;
