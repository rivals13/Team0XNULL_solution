import { IsArray, IsString, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GrantConsentDto {
  @ApiProperty({
    description: 'Data types the user is consenting to share',
    example: ['transactions', 'profile', 'bills'],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  dataTypes: string[];
}
