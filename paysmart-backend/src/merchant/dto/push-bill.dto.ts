import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsPositive, IsDateString, IsOptional } from 'class-validator';

export class PushBillDto {
  @ApiProperty({
    example: '9841234567',
    description: "Student's registered phone number in PaySmart (9841234567 or +9779841234567)",
  })
  @IsString()
  student_phone: string;

  @ApiProperty({ example: 5500.00, description: 'Bill amount in NPR' })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({ example: '2026-06-30', description: 'ISO 8601 due date' })
  @IsDateString()
  due_date: string;

  @ApiPropertyOptional({ example: 'Second semester fee — 2026', description: 'Human-readable description' })
  @IsOptional()
  @IsString()
  description?: string;
}
