import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject, IsBoolean } from 'class-validator';

/**
 * DTO for creating a new biller account during onboarding.
 *
 * The backend auto-creates / upserts a Merchant by `billerSlug` so that
 * each service provider (NEA, KUKL, College Fee, Traffic Police, etc.)
 * has a corresponding row in the `merchants` table.
 */
export class CreateBillerAccountDto {
  @ApiProperty({ example: 'NEA Electricity' })
  @IsString()
  billerName: string;

  @ApiProperty({ example: 'nea-electricity', description: 'URL-friendly slug used to upsert the merchant' })
  @IsString()
  billerSlug: string;

  @ApiProperty({ example: 'electricity', description: 'electricity | water | education | traffic | other' })
  @IsString()
  billerCategory: string;

  @ApiProperty({ example: '1234567', description: 'Customer ID / SC No. / Chit No. / Student ID' })
  @IsString()
  customerId: string;

  @ApiPropertyOptional({
    example: { officeCode: '01' },
    description: 'Provider-specific fields (officeCode, areaCode, chitNumber, fiscalYear, province, schoolName, etc.)',
  })
  @IsOptional()
  @IsObject()
  details?: Record<string, unknown>;

  @ApiPropertyOptional({ example: 'Home Electricity' })
  @IsOptional()
  @IsString()
  nickname?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
