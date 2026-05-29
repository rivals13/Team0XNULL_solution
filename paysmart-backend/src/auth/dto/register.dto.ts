import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, IsOptional, IsEnum } from 'class-validator';
import { UserRole } from '@prisma/client';

export class RegisterDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ example: '+9779812345678' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: 'StrongPass@123', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({
    enum: UserRole,
    default: UserRole.USER,
    description: 'USER for customers, MERCHANT for service providers/billers',
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
