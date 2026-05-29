/**
 * Central place for every SMS message template.
 * Keep messages short — Nepal GSM limit is 160 chars per segment.
 */
export class SmsTemplates {
  // ─── OTP ────────────────────────────────────────────────────────────────────
  static otp(code: string, expiresMinutes: number): string {
    return `Your PaySmart OTP is ${code}. Valid for ${expiresMinutes} minutes. Never share this code.`;
  }

  // ─── Payment ─────────────────────────────────────────────────────────────────
  static paymentSuccess(amount: number, provider: string, txnId: string): string {
    return `PaySmart: Rs.${amount} payment via ${provider} was SUCCESSFUL. Ref: ${txnId.slice(-8).toUpperCase()}. Thank you!`;
  }

  static paymentFailed(amount: number, provider: string, reason?: string): string {
    const why = reason ? ` Reason: ${reason}.` : '';
    return `PaySmart: Rs.${amount} payment via ${provider} FAILED.${why} Please retry or contact support.`;
  }

  static scheduledPaymentSuccess(amount: number, provider: string): string {
    return `PaySmart: Your scheduled payment of Rs.${amount} via ${provider} was processed successfully.`;
  }

  // ─── Bill reminders ──────────────────────────────────────────────────────────
  static billDueTomorrow(merchantName: string, amount: number): string {
    return `PaySmart Reminder: Your ${merchantName} bill of Rs.${amount} is due TOMORROW. Pay now to avoid late fees.`;
  }

  static billDueToday(merchantName: string, amount: number): string {
    return `PaySmart: Your ${merchantName} bill of Rs.${amount} is due TODAY. Open PaySmart to pay now.`;
  }

  static billOverdue(merchantName: string, amount: number): string {
    return `PaySmart Alert: Your ${merchantName} bill of Rs.${amount} is OVERDUE. Please pay immediately.`;
  }

  static billPaid(merchantName: string, amount: number): string {
    return `PaySmart: Rs.${amount} ${merchantName} bill paid successfully. Thank you for using PaySmart!`;
  }

  // ─── Schedule ────────────────────────────────────────────────────────────────
  static scheduleCreated(name: string, amount: number, nextRun: Date): string {
    const date = nextRun.toLocaleDateString('en-NP', { day: '2-digit', month: 'short', year: 'numeric' });
    return `PaySmart: Schedule "${name}" created. Rs.${amount} will be auto-paid on ${date}.`;
  }
}
