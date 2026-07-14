import { ApiProperty } from '@nestjs/swagger'
import { IsString, MinLength } from 'class-validator'

export class LookupPropertyDto {
  @ApiProperty({ description: 'Address query string to geocode' })
  @IsString()
  @MinLength(1)
  address!: string
}
