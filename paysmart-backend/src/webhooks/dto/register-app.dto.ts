import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsUrl, IsOptional, IsBoolean, MinLength } from 'class-validator';

export class RegisterAppDto {
  @ApiProperty({ example: 'MyFinanceApp', description: 'Descriptive name for your application' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiPropertyOptional({
    example: 'https://myapp.com/webhooks/paysmart',
    description: 'PaySmart will POST events here',
  })
  @IsOptional()
  @IsUrl({ require_tld: false }) // allow localhost in dev
  webhookUrl?: string;
}

export class UpdateAppDto {
  @ApiPropertyOptional({ example: 'Updated App Name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'https://myapp.com/webhooks/v2' })
  @IsOptional()
  @IsUrl({ require_tld: false })
  webhookUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
