import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString, IsArray, IsNumber, IsPositive,
  IsDateString, IsOptional, ValidateNested, ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ExternalTransactionDto {
  @ApiProperty({ example: 'NEA', description: 'Who the money went to / came from' })
  @IsString()
  payee: string;

  @ApiProperty({ example: 1225.0 })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({ example: '2026-05-01', description: 'ISO date of the transaction' })
  @IsDateString()
  date: string;

  @ApiPropertyOptional({ example: 'Electricity bill - Boudha', description: 'Optional note' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class PushTransactionsDto {
  @ApiProperty({
    example: 'HamroFinance',
    description: 'Name of the app pushing transactions — used as provider label in PaySmart',
  })
  @IsString()
  app_source: string;

  @ApiProperty({
    example: 'clxxxxx',
    description: 'PaySmart user ID whose transaction history this belongs to',
  })
  @IsString()
  user_id: string;

  @ApiProperty({ type: [ExternalTransactionDto], minItems: 1 })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ExternalTransactionDto)
  transactions: ExternalTransactionDto[];
}
