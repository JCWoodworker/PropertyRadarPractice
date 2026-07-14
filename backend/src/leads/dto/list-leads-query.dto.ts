import { ApiPropertyOptional } from '@nestjs/swagger'
import { Transform, Type } from 'class-transformer'
import { IsIn, IsInt, IsOptional, IsString, Length, Max, MaxLength, Min } from 'class-validator'

import { LEAD_STAGES, type LeadStage } from './create-lead.dto'

export const LEAD_SORT_FIELDS = [
  'name',
  'company',
  'address',
  'stage',
  'roofAgeYears',
  'distressFlag',
  'createdAt',
] as const

export type LeadSortField = (typeof LEAD_SORT_FIELDS)[number]

export const SORT_ORDERS = ['asc', 'desc'] as const

export type SortOrder = (typeof SORT_ORDERS)[number]

export class ListLeadsQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1

  @ApiPropertyOptional({ default: 25, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 25

  @ApiPropertyOptional({ enum: LEAD_SORT_FIELDS, default: 'createdAt' })
  @IsOptional()
  @IsIn(LEAD_SORT_FIELDS)
  sortBy?: LeadSortField = 'createdAt'

  @ApiPropertyOptional({ enum: SORT_ORDERS, default: 'desc' })
  @IsOptional()
  @IsIn(SORT_ORDERS)
  sortOrder?: SortOrder = 'desc'

  @ApiPropertyOptional({ enum: LEAD_STAGES, description: 'Filter to a single pipeline stage' })
  @IsOptional()
  @IsIn(LEAD_STAGES)
  stage?: LeadStage

  @ApiPropertyOptional({ minimum: 0, description: 'Minimum roof age (years), inclusive' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  roofAgeMin?: number

  @ApiPropertyOptional({ minimum: 0, description: 'Maximum roof age (years), inclusive' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  roofAgeMax?: number

  @ApiPropertyOptional({
    minLength: 2,
    maxLength: 2,
    description: 'Two-letter US state code, matched against the trailing ", ST" in the address',
  })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase() : value))
  state?: string

  @ApiPropertyOptional({ description: 'Case-insensitive search across name, company, and address' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string
}
