import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Transactions')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new transaction record' })
  create(@CurrentUser() user: any, @Body() dto: CreateTransactionDto) {
    return this.transactionsService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get paginated transaction history' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @CurrentUser() user: any,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.transactionsService.findAllByUser(user.id, +page, +limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single transaction' })
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.transactionsService.findOne(id, user.id);
  }
}
