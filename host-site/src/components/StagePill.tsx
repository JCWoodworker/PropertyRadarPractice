import { Check, ChevronDown } from 'lucide-react'
import {
  Badge,
  type BadgeProps,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  cn,
} from '@parceliq/ui'

import type { LeadStage } from '../lib/leads-store'

const STAGES: LeadStage[] = ['Needs Estimate', 'Scheduled', 'Quoted', 'Won', 'Lost']

const STAGE_TONE: Record<LeadStage, BadgeProps['variant']> = {
  'Needs Estimate': 'secondary',
  Scheduled: 'default',
  Quoted: 'default',
  Won: 'success',
  Lost: 'outline',
}

export interface StagePillProps {
  stage: LeadStage
  onChange: (stage: LeadStage) => void
  disabled?: boolean
}

/** A clickable Stage badge that opens a dropdown to move the lead to a different pipeline stage. */
export function StagePill({ stage, onChange, disabled }: StagePillProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={disabled}
        className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        aria-label={`Change stage for this lead, currently ${stage}`}
      >
        <Badge variant={STAGE_TONE[stage]} className="cursor-pointer gap-1">
          {stage}
          <ChevronDown className="size-3" aria-hidden="true" />
        </Badge>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {STAGES.map((option) => (
          <DropdownMenuItem key={option} onSelect={() => onChange(option)}>
            <Check className={cn('size-3.5', option === stage ? 'opacity-100' : 'opacity-0')} aria-hidden="true" />
            {option}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
