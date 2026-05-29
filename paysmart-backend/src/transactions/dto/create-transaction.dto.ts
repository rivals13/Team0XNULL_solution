import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsEnum, IsOptional, IsPositive } from 'class-validator';

export enum TransactionType {
  DEBIT = 'DEBIT',
  CREDIT = 'CREDIT',
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export class CreateTransactionDto {
  @ApiProperty({ example: 500.0 })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({ enum: TransactionType })
  @IsEnum(TransactionType)
  type: TransactionType;

  @ApiPropertyOptional({ example: 'Utility bill payment' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'ESEWA' })
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiPropertyOptional({ example: 'TXN-ABC123' })
  @IsOptional()
  @IsString()
  externalId?: string;
}
