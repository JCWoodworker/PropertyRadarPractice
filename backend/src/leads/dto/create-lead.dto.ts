import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  IsDateString,
  IsIn,
  IsInt,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator'

export const LEAD_STAGES = [
  'Needs Estimate',
  'Scheduled',
  'Quoted',
  'Won',
  'Lost',
] as const

export type LeadStage = (typeof LEAD_STAGES)[number]

export class CreateLeadDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  company!: string

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  address!: string

  @ApiProperty({ enum: LEAD_STAGES })
  @IsIn(LEAD_STAGES)
  stage!: LeadStage

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  roofAgeYears!: number

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  roofMaterial!: string

  @ApiProperty({ example: '2026-01-01' })
  @IsDateString()
  lastInspection!: string
}
