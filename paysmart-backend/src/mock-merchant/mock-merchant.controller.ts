import { Controller, Get, Post, Param, Query, Body, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { BillInquiryService } from '../bill-inquiry/bill-inquiry.service';

/**
 * MockMerchantController — simulates external merchant APIs for dev/testing.
 *
 * GET  /api/v1/mock-merchant/:slug/bill-inquiry?customerId=XXX
 * POST /api/v1/mock-merchant/:slug/check-customer  { customerId }
 *
 * hasDue rules:
 *   ALL merchants → hasDue: true  (always has a pending bill)
 *   EXCEPT: vianet, cgnet        → hasDue: false
 *
 * Valid customer IDs per merchant:
 *   nea-electricity      SC-001, SC-002, SC-003, NEA-12345, 12345, 123456, 789012
 *   kukl-water           KUKL-001, WTR-001, 001234, KUKL-1234, KUKL-5678
 *   vianet               VNT-001, VNT-002, vianet-001, 9841000001
 *   worldlink            WL-12345, WL-99999
 *   subisu               SUB-3001
 *   dishhome             DH-001234
 *   himalayan-college    HC-2024-001, STU-001, 2024001, 2024002, 2024003
 *   nepal-traffic-police KTM-001, KTM-2026-001, CHIT-001, KTM-2026-100, KTM-2026-200
 *   nepal-life           NLI-001, NLI-002, POL-001
 */

const DUE = '2026-06-15';

// ── Merchants that never have a pending bill ──────────────────────────────────
const NO_DUE = new Set(['vianet', 'cgnet', 'dishome-fiber']);

// ── Per-merchant fixed bill data (overrides per-customer amount for hasDue check) ──
const MERCHANT_BILL: Record<string, { amount: number; description: string }> = {
  'nea-electricity':     { amount: 1250,  description: 'NEA Electricity Bill Due' },
  'kukl-water':          { amount: 450,   description: 'KUKL Water Bill Due' },
  'himalayan-college':   { amount: 15000, description: '2nd Semester Fee Due' },
  'nepal-traffic-police':{ amount: 1000,  description: 'Traffic Fine Due' },
  'nepal-life':          { amount: 5000,  description: 'Insurance Premium Due' },
  'prime-life':          { amount: 4500,  description: 'Insurance Premium Due' },
  'nlic':                { amount: 3800,  description: 'Insurance Premium Due' },
  'prabhu-life':         { amount: 4000,  description: 'Insurance Premium Due' },
  'worldlink':           { amount: 1299,  description: 'WorldLink Internet Bill Due' },
  'subisu':              { amount: 999,   description: 'Subisu Internet Bill Due' },
  'dishhome':            { amount: 599,   description: 'DishHome TV Bill Due' },
};

// ── Per-customer database (used for validation only) ─────────────────────────
const CUSTOMER_DB: Record<string, Set<string>> = {
  'nea-electricity':     new Set(['SC-001','SC-002','SC-003','NEA-12345','12345','123456','789012']),
  'kukl-water':          new Set(['KUKL-001','WTR-001','001234','KUKL-1234','KUKL-5678']),
  'vianet':              new Set(['VNT-001','VNT-002','vianet-001','9841000001']),
  'worldlink':           new Set(['WL-12345','WL-99999']),
  'subisu':              new Set(['SUB-3001']),
  'dishhome':            new Set(['DH-001234']),
  'himalayan-college':   new Set(['HC-2024-001','STU-001','2024001','2024002','2024003']),
  'nepal-traffic-police':new Set(['KTM-001','KTM-2026-001','CHIT-001','KTM-2026-100','KTM-2026-200']),
  'nepal-life':          new Set(['NLI-001','NLI-002','POL-001']),
  'prime-life':          new Set(['PRL-001','PRL-002']),
  'nlic':                new Set(['NLIC-001','NLIC-002']),
  'prabhu-life':         new Set(['PBL-001','PBL-002']),
};

// ─────────────────────────────────────────────────────────────────────────────

function lookup(slug: string, customerId: string) {
  const cid       = customerId?.trim();
  const customers = CUSTOMER_DB[slug];

  // ── If customer recently paid → no due until next billing cycle ──────────
  if (wasRecentlyPaid(slug, cid)) {
    return { found: true, hasDue: false, message: 'No pending bill — recently paid. Next bill arrives next month.' };
  }

  // Unknown merchant slug — generic fallback
  if (!customers) {
    if (NO_DUE.has(slug)) {
      return { found: true, hasDue: false, message: 'No pending bill' };
    }
    const bill = MERCHANT_BILL[slug] ?? { amount: 500, description: `${slug} bill due` };
    return { found: true, hasDue: true, ...bill, dueDate: DUE, customerId: cid };
  }

  // Check if customer ID is registered
  if (!customers.has(cid)) {
    return {
      found:   false,
      hasDue:  false,
      message: `Customer ID "${cid}" not found. Valid IDs: ${[...customers].slice(0, 5).join(', ')}`,
    };
  }

  // Customer found — check if merchant has due
  if (NO_DUE.has(slug)) {
    return { found: true, hasDue: false, message: 'No pending bill' };
  }

  const bill = MERCHANT_BILL[slug] ?? { amount: 500, description: `${slug} bill due` };
  return {
    found:       true,
    hasDue:      true,
    customerId,
    amount:      bill.amount,
    dueDate:     DUE,
    description: bill.description,
  };
}

// ─────────────────────────────────────────────────────────────────────────────

// ── In-memory log of received customer actions ────────────────────────────────
const ACTION_LOG: Array<{ ts: string; slug: string; customerId: string; action: string; amount?: number }> = [];

/**
 * Recently-paid tracker — "slug:customerId" → timestamp of payment.
 * After payment, hasDue returns false for this customer for 90 seconds
 * (simulates a billing cycle gap before next bill arrives).
 */
const RECENTLY_PAID = new Map<string, number>(); // key → paidAt ms
const PAID_COOLDOWN_MS = 90_000; // 90 seconds

function wasRecentlyPaid(slug: string, customerId: string): boolean {
  const key = `${slug}:${customerId}`;
  const ts  = RECENTLY_PAID.get(key);
  if (!ts) return false;
  if (Date.now() - ts > PAID_COOLDOWN_MS) {
    RECENTLY_PAID.delete(key); // expired — new billing cycle
    return false;
  }
  return true;
}

function markPaid(slug: string, customerId: string) {
  RECENTLY_PAID.set(`${slug}:${customerId}`, Date.now());
}

@ApiTags('Mock Merchant (Dev/Test)')
@Controller('mock-merchant')
export class MockMerchantController {
  private readonly logger = new Logger(MockMerchantController.name);

  constructor(private readonly billInquiry: BillInquiryService) {}

  /** GET /api/v1/mock-merchant/:slug/bill-inquiry?customerId=XXX */
  @Public()
  @Get(':slug/bill-inquiry')
  @ApiOperation({ summary: 'Mock bill inquiry — GET' })
  @ApiParam({ name: 'slug', example: 'nea-electricity' })
  @ApiQuery({ name: 'customerId', example: 'SC-001', required: false })
  inquireBill(@Param('slug') slug: string, @Query('customerId') customerId: string) {
    return lookup(slug, customerId);
  }

  /** POST /api/v1/mock-merchant/:slug/check-customer  { customerId: "SC-001" } */
  @Public()
  @Post(':slug/check-customer')
  @ApiOperation({ summary: 'Mock customer check — POST (no phone required)' })
  @ApiParam({ name: 'slug', example: 'nea-electricity' })
  checkCustomer(@Param('slug') slug: string, @Body() body: { customerId?: string }) {
    return lookup(slug, body.customerId ?? '');
  }

  /**
   * POST /api/v1/mock-merchant/:slug/customer-action
   *
   * PaySmart calls this on 3 events: SAVED | PAY_NOW | SCHEDULED
   * Body: { customerId, action, amount?, scheduledDate? }
   *
   * Merchant logs the action, checks if customer has a due bill,
   * and if so — after a short delay — triggers the bill inquiry
   * which sends a WebSocket popup to the user.
   *
   * TESTING delays:
   *   SAVED     → 20 seconds
   *   PAY_NOW   → 5 seconds  (quick payment confirmation)
   *   SCHEDULED → 10 seconds (schedule confirmation)
   */
  @Public()
  @Post(':slug/customer-action')
  @ApiOperation({ summary: 'Receive customer action from PaySmart (SAVED / PAY_NOW / SCHEDULED)' })
  @ApiParam({ name: 'slug', example: 'nea-electricity' })
  async customerAction(
    @Param('slug') slug: string,
    @Body() body: {
      customerId:    string;
      action:        'SAVED' | 'PAY_NOW' | 'SCHEDULED';
      amount?:       number;
      scheduledDate?: string;
    },
  ) {
    const { customerId, action, amount, scheduledDate } = body;

    // Log the action
    const entry = { ts: new Date().toISOString(), slug, customerId, action, amount, scheduledDate };
    ACTION_LOG.unshift(entry);
    if (ACTION_LOG.length > 100) ACTION_LOG.splice(100);

    this.logger.log(`[MerchantAction] ${slug} | ${customerId} | ${action} | NPR ${amount ?? '—'}`);

    // Check if this customer has a pending bill
    const billResult = lookup(slug, customerId);
    const hasDue = (billResult as any).found === true && (billResult as any).hasDue !== false && typeof (billResult as any).amount === 'number';

    if (!hasDue) {
      return {
        received:  true,
        hasDue:    false,
        action,
        message:   `${slug}: no pending bill for ${customerId}`,
      };
    }

    // ── PAY_NOW: mark as paid, no further notification ─────────────────────
    if (action === 'PAY_NOW') {
      markPaid(slug, customerId);
      this.logger.log(`[MerchantAction] Payment received from ${customerId} at ${slug} — marked as paid (no push)`);
      return {
        received:  true,
        hasDue:    false,          // ← no more due after payment
        action,
        message:   `${slug}: payment confirmed for ${customerId}. No pending bill until next cycle.`,
      };
    }

    // ── SCHEDULED: acknowledge, no push ────────────────────────────────────
    if (action === 'SCHEDULED') {
      return {
        received: true,
        hasDue:   true,
        action,
        message:  `${slug}: payment scheduled for ${customerId} — acknowledged, no push.`,
      };
    }

    // ── SAVED: push bill after 20 seconds (first time notification) ────────
    this.logger.log(`[MerchantAction] Bill due for ${customerId} at ${slug} — pushing in 20s`);

    setTimeout(async () => {
      // Double-check: don't push if customer paid in the meantime
      if (wasRecentlyPaid(slug, customerId)) {
        this.logger.debug(`[MerchantAction] Skipping push — customer ${customerId} already paid`);
        return;
      }
      try {
        await this.billInquiry.triggerBillForCustomer(slug, customerId);
        this.logger.log(`[MerchantAction] Bill pushed for ${slug}/${customerId}`);
      } catch (err: any) {
        this.logger.warn(`[MerchantAction] Trigger failed for ${slug}/${customerId}: ${err?.message}`);
      }
    }, 20_000);

    return {
      received:  true,
      hasDue:    true,
      action,
      amount:    (billResult as any).amount,
      dueDate:   (billResult as any).dueDate,
      message:   `Bill confirmed. Pushing to PaySmart in 20 seconds.`,
    };
  }

  /** GET /api/v1/mock-merchant/actions — view recent customer actions (dev) */
  @Public()
  @Get('actions')
  @ApiOperation({ summary: 'List recent customer actions received by mock merchant' })
  getActions() {
    return { total: ACTION_LOG.length, actions: ACTION_LOG.slice(0, 20) };
  }
}
