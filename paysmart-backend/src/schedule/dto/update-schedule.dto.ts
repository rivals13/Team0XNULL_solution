import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString, IsNumber, IsEnum, IsOptional,
  IsPositive, IsDateString, IsBoolean,
} from 'class-validator';
import { ScheduleFreq } from '@prisma/client';

export class UpdateScheduleDto {
  @ApiPropertyOptional({ example: 'Electricity Bill v2' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 1600.0 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  amount?: number;

  @ApiPropertyOptional({ example: '9801234567' })
  @IsOptional()
  @IsString()
  recipientId?: string;

  @ApiPropertyOptional({ enum: ScheduleFreq })
  @IsOptional()
  @IsEnum(ScheduleFreq)
  frequency?: ScheduleFreq;

  @ApiPropertyOptional({ example: '2025-03-01T10:00:00Z', description: 'Reschedule next run' })
  @IsOptional()
  @IsDateString()
  nextRunAt?: string;

  @ApiPropertyOptional({ example: '2025-12-31T23:59:59Z' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ example: '0 10 1 * *' })
  @IsOptional()
  @IsString()
  cronExpression?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  autoRetry?: boolean;

  @ApiPropertyOptional({ example: 'Updated description' })
  @IsOptional()
  @IsString()
  description?: string;
}
