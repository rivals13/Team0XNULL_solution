import { Injectable, Logger } from '@nestjs/common';

/**
 * DataMinimizationService
 *
 * Enforces the principle of data minimization by:
 * 1. Stripping fields that should NEVER be stored (passwords, pins, OTPs, CVVs, full bank numbers)
 * 2. Sanitizing eSewa API responses to retain only the minimum required fields
 */
@Injectable()
export class DataMinimizationService {
  private readonly logger = new Logger(DataMinimizationService.name);

  // Fields that must NEVER be stored, even encrypted
  private static readonly FORBIDDEN_FIELDS = new Set([
    'password',
    'mpin',
    'pin',
    'otp',
    'cvv',
    'cvc',
    'securityCode',
    'security_code',
    'cardVerificationValue',
    'bankAccountNumber',
    'bank_account_number',
    'accountNumber',      // full bank account numbers
    'routingNumber',
    'routing_number',
    'ssn',
    'socialSecurityNumber',
    'esewa_password',
    'esewa_mpin',
    'esewa_otp',
    'khalti_pin',
    'khalti_mpin',
    'transactionPin',
    'transaction_pin',
    'secretKey',
    'secret_key',
    'privateKey',
    'private_key',
  ]);

  // Pattern-based detection for fields that look like sensitive values
  private static readonly FORBIDDEN_PATTERNS = [
    /password/i,
    /mpin/i,
    /\botp\b/i,
    /\bcvv\b/i,
    /\bcvc\b/i,
    /secret[\s_-]?key/i,
    /private[\s_-]?key/i,
    /transaction[\s_-]?pin/i,
  ];

  /**
   * Remove any field whose key matches a forbidden field name or pattern.
   * Works recursively on nested objects.
   * Logs a warning whenever a forbidden field is detected and stripped.
   */
  stripSensitiveFields<T extends Record<string, any>>(data: T): Partial<T> {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return data;

    const cleaned: Partial<T> = {};

    for (const [key, value] of Object.entries(data)) {
      if (this.isForbiddenKey(key)) {
        this.logger.warn(`[DataMinimization] Stripped forbidden field: "${key}"`);
        continue;
      }

      if (value && typeof value === 'object' && !Array.isArray(value)) {
        cleaned[key as keyof T] = this.stripSensitiveFields(value) as any;
      } else {
        cleaned[key as keyof T] = value;
      }
    }

    return cleaned;
  }

  /**
   * Sanitize an eSewa API response, keeping only the minimum required fields:
   * transaction_id, amount, payee, date/transactionDate, status.
   * Everything else is dropped — especially credentials, tokens, raw account data.
   */
  sanitizeEsewaResponse(response: Record<string, any>): {
    transaction_id?: string;
    amount?: number;
    payee?: string;
    date?: string;
    status?: string;
  } {
    if (!response || typeof response !== 'object') return {};

    // Allow-list: only these fields are retained
    const allowedKeys: Record<string, string> = {
      transaction_id: 'transaction_id',
      transactionId: 'transaction_id',
      txnId: 'transaction_id',
      ref_id: 'transaction_id',
      amount: 'amount',
      total_amount: 'amount',
      payee: 'payee',
      payee_name: 'payee',
      merchant_name: 'payee',
      date: 'date',
      transaction_date: 'date',
      transactionDate: 'date',
      created_at: 'date',
      status: 'status',
      transaction_status: 'status',
    };

    const sanitized: Record<string, any> = {};

    for (const [rawKey, mappedKey] of Object.entries(allowedKeys)) {
      if (response[rawKey] !== undefined && sanitized[mappedKey] === undefined) {
        sanitized[mappedKey] = response[rawKey];
      }
    }

    // Ensure amount is numeric
    if (sanitized['amount'] !== undefined) {
      sanitized['amount'] = parseFloat(sanitized['amount']) || 0;
    }

    return sanitized;
  }

  /**
   * Sanitize a list of eSewa transactions.
   */
  sanitizeEsewaTransactions(
    transactions: Record<string, any>[],
  ): ReturnType<DataMinimizationService['sanitizeEsewaResponse']>[] {
    if (!Array.isArray(transactions)) return [];
    return transactions.map(t => this.sanitizeEsewaResponse(t));
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private isForbiddenKey(key: string): boolean {
    if (DataMinimizationService.FORBIDDEN_FIELDS.has(key)) return true;
    return DataMinimizationService.FORBIDDEN_PATTERNS.some(p => p.test(key));
  }
}
