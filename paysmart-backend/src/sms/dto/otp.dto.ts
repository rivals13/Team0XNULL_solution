import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, Length } from 'class-validator';

export class SendOtpDto {
  @ApiProperty({ example: '9801234567', description: 'Nepal phone number (10 digits)' })
  @IsString()
  @Matches(/^(98|97)\d{8}$/, { message: 'Must be a valid Nepal phone number (e.g. 9801234567)' })
  phone: string;
}

export class VerifyOtpDto {
  @ApiProperty({ example: '9801234567' })
  @IsString()
  @Matches(/^(98|97)\d{8}$/, { message: 'Must be a valid Nepal phone number' })
  phone: string;

  @ApiProperty({ example: '382910' })
  @IsString()
  @Length(4, 8)
  otp: string;
}
