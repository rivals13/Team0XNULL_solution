import { Controller, Get, Post, Param, Query, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';

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
  const customers = CUSTOMER_DB[slug];

  // Unknown merchant slug — generic fallback (always due, customer valid)
  if (!customers) {
    if (NO_DUE.has(slug)) {
      return { found: true, hasDue: false, message: 'No pending bill' };
    }
    const bill = MERCHANT_BILL[slug] ?? { amount: 500, description: `${slug} bill due` };
    return { found: true, hasDue: true, ...bill, dueDate: DUE, customerId };
  }

  // Check if customer ID is registered
  if (!customers.has(customerId?.trim())) {
    return {
      found:   false,
      hasDue:  false,
      message: `Customer ID "${customerId}" not found. Valid IDs: ${[...customers].slice(0, 5).join(', ')}`,
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

@ApiTags('Mock Merchant (Dev/Test)')
@Controller('mock-merchant')
export class MockMerchantController {

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
}
