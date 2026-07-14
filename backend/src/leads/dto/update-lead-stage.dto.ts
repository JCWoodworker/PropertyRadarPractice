import { ApiProperty } from '@nestjs/swagger'
import { IsIn } from 'class-validator'

import { LEAD_STAGES, type LeadStage } from './create-lead.dto'

export class UpdateLeadStageDto {
  @ApiProperty({ enum: LEAD_STAGES })
  @IsIn(LEAD_STAGES)
  stage!: LeadStage
}
