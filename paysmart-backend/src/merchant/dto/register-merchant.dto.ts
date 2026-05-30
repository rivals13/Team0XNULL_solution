import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString, IsEnum, IsOptional, IsUrl, Matches,
  IsArray, ValidateNested, IsPhoneNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MerchantCategory } from '@prisma/client';

// ── Bank account sub-object ──────────────────────────────────────────────────

export class BankAccountDto {
  @ApiProperty({ example: 'NIC Asia Bank', description: 'Name of the bank' })
  @IsString()
  bankName: string;

  @ApiProperty({ example: '0110100123456701', description: '16-digit account number' })
  @IsString()
  accountNumber: string;

  @ApiProperty({ example: 'Himalayan College Pvt. Ltd.', description: 'Account holder name (must match bank records)' })
  @IsString()
  accountHolder: string;

  @ApiPropertyOptional({ example: 'Baneshwor, Kathmandu', description: 'Branch name or code' })
  @IsOptional()
  @IsString()
  branchCode?: string;
}

// ── Register merchant DTO ────────────────────────────────────────────────────

export class RegisterMerchantDto {
  @ApiProperty({ example: 'Himalayan College', description: 'Display name shown to students' })
  @IsString()
  name: string;

  @ApiProperty({
    example: 'himalayan-college',
    description: 'URL-safe unique slug (lowercase letters, digits, hyphens only)',
  })
  @IsString()
  @Matches(/^[a-z0-9-]+$/, { message: 'slug must be lowercase letters, numbers and hyphens only' })
  slug: string;

  @ApiProperty({ enum: MerchantCategory, example: MerchantCategory.EDUCATION })
  @IsEnum(MerchantCategory)
  category: MerchantCategory;

  @ApiPropertyOptional({ example: 'Official fee collection portal' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'https://himalayan.edu.np' })
  @IsOptional()
  @IsUrl()
  website?: string;

  // ── Bill Inquiry ─────────────────────────────────────────────────────────

  @ApiPropertyOptional({
    example: 'https://api.himalayan.edu.np/bill-inquiry',
    description: 'Merchant bill inquiry endpoint — GET {url}?customerId={id}',
  })
  @IsOptional()
  @IsUrl()
  billInquiryUrl?: string;

  @ApiPropertyOptional({
    example: 'super-secret-api-key',
    description: 'API key for the bill inquiry endpoint — will be AES-256-GCM encrypted at rest',
  })
  @IsOptional()
  @IsString()
  billInquiryApiKey?: string;

  // ── Payment methods (students see these as locked payment targets) ───────

  @ApiPropertyOptional({
    example: '9841234567',
    description: 'Merchant eSewa-registered phone number — students pay to this number',
  })
  @IsOptional()
  @IsString()
  esewaId?: string;

  @ApiPropertyOptional({
    example: '9841234567',
    description: 'Merchant Khalti-registered phone number',
  })
  @IsOptional()
  @IsString()
  khaltiId?: string;

  @ApiPropertyOptional({
    type: [BankAccountDto],
    description: 'One or more bank accounts students can bank-transfer fees to',
    example: [{
      bankName:      'NIC Asia Bank',
      accountNumber: '0110100123456701',
      accountHolder: 'Himalayan College Pvt. Ltd.',
      branchCode:    'Baneshwor, Kathmandu',
    }],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BankAccountDto)
  bankAccounts?: BankAccountDto[];
}

// ── Update payment methods only (called by merchant with their API key) ──────

export class UpdatePaymentMethodsDto {
  @ApiPropertyOptional({ example: '9841234567' })
  @IsOptional()
  @IsString()
  esewaId?: string;

  @ApiPropertyOptional({ example: '9841234567' })
  @IsOptional()
  @IsString()
  khaltiId?: string;

  @ApiPropertyOptional({ type: [BankAccountDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BankAccountDto)
  bankAccounts?: BankAccountDto[];
}
