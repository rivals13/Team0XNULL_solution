import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString, IsNumber, IsEnum, IsOptional,
  IsPositive, IsDateString, IsBoolean, IsInt, Min, Max,
} from 'class-validator';
import { ScheduleFreq } from '@prisma/client';

export class CreateScheduleDto {
  @ApiProperty({ example: 'Electricity Bill' })
  @IsString()
  name: string;

  @ApiProperty({ example: 1500.0 })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({ example: 'ESEWA' })
  @IsString()
  provider: string;

  @ApiProperty({ example: '9801234567' })
  @IsString()
  recipientId: string;

  @ApiProperty({ enum: ScheduleFreq, example: ScheduleFreq.MONTHLY })
  @IsEnum(ScheduleFreq)
  frequency: ScheduleFreq;

  @ApiProperty({ example: '2025-02-01T10:00:00Z' })
  @IsDateString()
  nextRunAt: string;

  @ApiPropertyOptional({ example: '0 10 1 * *', description: 'Required when frequency is CUSTOM_CRON' })
  @IsOptional()
  @IsString()
  cronExpression?: string;

  @ApiPropertyOptional({ example: '2025-12-31T23:59:59Z' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  autoRetry?: boolean;

  @ApiPropertyOptional({ example: 3, description: '0 = unlimited, 1-10 = stop after N payments' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  maxOccurrences?: number;

  @ApiPropertyOptional({ example: 'Monthly electricity payment' })
  @IsOptional()
  @IsString()
  description?: string;
}
