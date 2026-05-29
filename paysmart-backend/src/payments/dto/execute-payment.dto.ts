import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsPositive, IsOptional } from 'class-validator';

export class ExecutePaymentDto {
  @ApiProperty({ example: 500.0 })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({ example: 'ESEWA', description: 'Payment provider (ESEWA | KHALTI)' })
  @IsString()
  provider: string;

  @ApiProperty({ example: '9801234567' })
  @IsString()
  recipientId: string;

  @ApiPropertyOptional({ example: 'Electricity Bill' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'sch_abc123', description: 'Schedule ID if triggered by schedule' })
  @IsOptional()
  @IsString()
  scheduleId?: string;

  @ApiPropertyOptional({ example: 'bill_abc123', description: 'Bill ID to mark as PAID after successful payment' })
  @IsOptional()
  @IsString()
  billId?: string;
}
