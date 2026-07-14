import { ApiProperty } from '@nestjs/swagger'
import { IsString, MaxLength, MinLength } from 'class-validator'

export class SuggestPropertyDto {
  @ApiProperty({ description: 'Partial address text to fetch autocomplete suggestions for' })
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  q!: string
}
