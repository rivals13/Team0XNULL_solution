import {
  Controller, Get, Query, NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { BillInquiryService } from './bill-inquiry.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * BillInquiryController
 *
 * GET /bill-inquiry/validate?merchantSlug=xxx&customerId=yyy
 *   → Validates a customer ID against the merchant's bill-inquiry API
 *     WITHOUT creating a biller account or saving anything to the DB.
 *     Used by Onboarding to block invalid customer IDs before saving.
 *
 *   Returns:
 *     { valid: true, bill: { amount, dueDate, description, ... } }  — customer exists
 *     { valid: false, reason: 'CUSTOMER_NOT_FOUND' }                — not in merchant DB
 *     { valid: false, reason: 'NO_INQUIRY_URL' }                   — merchant not set up
 */
@ApiTags('Bill Inquiry')
@ApiBearerAuth('JWT')
@Controller('bill-inquiry')
export class BillInquiryController {
  constructor(
    private readonly service: BillInquiryService,
    private readonly prisma:  PrismaService,
  ) {}

  @Get('validate')
  @ApiOperation({
    summary: 'Validate customer ID against merchant database (no account required)',
    description:
      'Calls the merchant billInquiryUrl with the given customerId. ' +
      'Returns { valid: true, bill: {...} } if found, or { valid: false, reason } if not.',
  })
  @ApiQuery({ name: 'merchantSlug', required: true, example: 'nea-electricity' })
  @ApiQuery({ name: 'customerId',   required: true, example: '123456' })
  async validate(
    @Query('merchantSlug') merchantSlug: string,
    @Query('customerId')   customerId:   string,
  ) {
    if (!merchantSlug?.trim() || !customerId?.trim()) {
      throw new NotFoundException('merchantSlug and customerId are required');
    }

    // Check merchant exists and has a billInquiryUrl configured
    const merchant = await this.prisma.merchant.findUnique({
      where:  { slug: merchantSlug },
      select: { id: true, billInquiryUrl: true },
    });

    if (!merchant) {
      return { valid: false, reason: 'MERCHANT_NOT_FOUND' };
    }

    if (!merchant.billInquiryUrl) {
      // Merchant exists but has no inquiry URL — cannot validate.
      // Allow the save so the user isn't blocked for non-inquiry merchants.
      return { valid: true, bill: null, reason: 'NO_INQUIRY_URL' };
    }

    // Call inquireBill without userId — does NOT save bill or notify
    let result: Awaited<ReturnType<typeof this.service.inquireBill>>;
    try {
      result = await this.service.inquireBill(merchantSlug, customerId);
    } catch (err: any) {
      if (err?.status === 404) return { valid: false, reason: 'MERCHANT_NOT_FOUND' };
      return { valid: false, reason: 'API_ERROR' };
    }

    if (!result) {
      return { valid: false, reason: 'CUSTOMER_NOT_FOUND' };
    }
    // Customer found but no pending bill (hasDue: false)
    if ((result as any).__noDue === true) {
      return { valid: true, bill: null, reason: 'NO_DUE' };
    }

    return { valid: true, bill: result };
  }
}
