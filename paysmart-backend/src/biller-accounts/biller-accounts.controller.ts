import { Controller, Get, Post, Delete, Body, Param, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { BillerAccountsService } from './biller-accounts.service';
import { CreateBillerAccountDto } from './dto/create-biller-account.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { BillInquiryService } from '../bill-inquiry/bill-inquiry.service';

@ApiTags('Biller Accounts')
@ApiBearerAuth('JWT')
@Controller('biller-accounts')
export class BillerAccountsController {
  constructor(
    private readonly service: BillerAccountsService,
    private readonly billInquiry: BillInquiryService,
  ) {}

  @Get()
  @ApiOperation({ summary: "List the current user's saved biller accounts" })
  list(@CurrentUser() user: any) {
    return this.service.list(user.id);
  }

  @Post()
  @ApiOperation({
    summary: 'Save a new biller account (NEA SC No., KUKL client code, school ID, traffic chit, etc.)',
    description: 'Auto-creates the Merchant row by slug if it does not already exist.',
  })
  create(@CurrentUser() user: any, @Body() dto: CreateBillerAccountDto) {
    return this.service.create(user.id, dto);
  }

  @Post(':id/check-bill')
  @ApiOperation({
    summary: 'Manually fetch the latest bill for a saved biller account',
    description:
      'Calls the merchant\'s billInquiryUrl, saves a new bill to DB if not already recorded, ' +
      'and sends a WebSocket notification. Returns bill details or { noBill: true }.',
  })
  checkBill(@Param('id') id: string, @Req() req: Request & { user: { id: string } }) {
    return this.billInquiry.checkBillForAccount(id, req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove a saved biller account' })
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.remove(user.id, id);
  }
}
