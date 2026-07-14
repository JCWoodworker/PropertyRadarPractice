import { ApiProperty } from '@nestjs/swagger'
import { IsString, MaxLength, MinLength } from 'class-validator'

export class FlagLeadDto {
  @ApiProperty({
    description:
      'Exact address string stored on the lead — the widget only knows the address, never the host lead id.',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  address!: string

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  reason!: string
}
