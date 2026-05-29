import {
  Controller, Post, Get, Patch, Body, Req, Query,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiResponse, ApiBearerAuth,
  ApiHeader, ApiQuery,
} from '@nestjs/swagger';
import { Request } from 'express';
import { UserRole } from '@prisma/client';
import { MerchantService } from './merchant.service';
import { RegisterMerchantDto, UpdatePaymentMethodsDto } from './dto/register-merchant.dto';
import { PushBillDto } from './dto/push-bill.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { MerchantApiKeyGuard } from './guards/merchant-api-key.guard';

// ── JWT-protected request shape ─────────────────────────────────────────────
interface AuthRequest extends Request {
  user: { id: string; role: UserRole };
}
// ── API-key-protected request shape ─────────────────────────────────────────
interface MerchantKeyRequest extends Request {
  merchant: { id: string; name: string };
}

@ApiTags('Merchant')
@Controller('merchant')
export class MerchantController {
  constructor(private readonly service: MerchantService) {}

  // ─── POST /merchant/register ───────────────────────────────────────────────

  @Roles(UserRole.ADMIN)
  @Post('register')
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Register a merchant / institution (ADMIN only)',
    description:
      'Admin creates a merchant profile (school, utility, etc.). ' +
      'Returns the API key **once** — hand it to the institution securely.',
  })
  @ApiResponse({ status: 201, description: 'Merchant registered — API key in response' })
  @ApiResponse({ status: 409, description: 'Slug already taken' })
  register(@Body() dto: RegisterMerchantDto) {
    return this.service.register(dto);
  }

  // ─── GET /merchant/profile ─────────────────────────────────────────────────

  @Public()
  @UseGuards(MerchantApiKeyGuard)
  @Get('profile')
  @ApiHeader({ name: 'X-API-Key', description: 'Merchant API key', required: true })
  @ApiOperation({ summary: 'Get merchant profile (X-API-Key)' })
  @ApiResponse({ status: 200, description: 'Merchant profile' })
  getProfile(@Req() req: MerchantKeyRequest) {
    return this.service.getProfileById(req.merchant.id);
  }

  // ─── POST /merchant/push-bill ──────────────────────────────────────────────

  @Public()
  @UseGuards(MerchantApiKeyGuard)
  @Post('push-bill')
  @HttpCode(HttpStatus.CREATED)
  @ApiHeader({
    name: 'X-API-Key',
    description: 'Merchant API key from POST /merchant/register',
    required: true,
  })
  @ApiOperation({
    summary: 'Push a bill to a student by phone number',
    description: `
Merchants use this endpoint to create a bill for a specific student.
The student is looked up by their PaySmart-registered phone number.
A BILL_DUE WebSocket + FCM notification is sent to the student immediately.

**Auth**: X-API-Key header (received on merchant registration).
    `.trim(),
  })
  @ApiResponse({ status: 201, description: 'Bill created and student notified' })
  @ApiResponse({ status: 401, description: 'Missing or invalid X-API-Key' })
  @ApiResponse({ status: 404, description: 'No PaySmart user with that phone number' })
  pushBill(@Req() req: MerchantKeyRequest, @Body() dto: PushBillDto) {
    return this.service.pushBill(req.merchant.id, req.merchant.name, dto);
  }

  // ─── PATCH /merchant/payment-methods ─────────────────────────────────────

  @Public()
  @UseGuards(MerchantApiKeyGuard)
  @Patch('payment-methods')
  @ApiHeader({ name: 'X-API-Key', description: 'Merchant API key', required: true })
  @ApiOperation({
    summary: 'Update merchant payment methods (X-API-Key)',
    description:
      'Merchant sets their eSewa ID, Khalti ID and/or bank accounts. ' +
      'These are shown as **locked** (non-editable) to students when paying bills.',
  })
  @ApiResponse({ status: 200, description: 'Payment methods updated' })
  updatePaymentMethods(@Req() req: MerchantKeyRequest, @Body() dto: UpdatePaymentMethodsDto) {
    return this.service.updatePaymentMethods(req.merchant.id, dto);
  }

  // ─── GET /merchant/bills ──────────────────────────────────────────────────
  // Spec: "Only MERCHANT role can access" — merchant authenticates via API key

  @Public()
  @UseGuards(MerchantApiKeyGuard)
  @Get('bills')
  @ApiHeader({ name: 'X-API-Key', description: 'Merchant API key', required: true })
  @ApiOperation({ summary: 'List all bills pushed by this merchant (X-API-Key)' })
  @ApiQuery({ name: 'page',  required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({ status: 200, description: 'Paginated bills with PENDING / PAID / OVERDUE status' })
  getBills(
    @Req() req: MerchantKeyRequest,
    @Query('page')  page  = '1',
    @Query('limit') limit = '20',
  ) {
    return this.service.getBills(req.merchant.id, Number(page), Number(limit));
  }
}
