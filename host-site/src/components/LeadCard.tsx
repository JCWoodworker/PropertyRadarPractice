import { Trash2, TriangleAlert } from 'lucide-react'
import { Button, StatBadge, cn } from '@parceliq/ui'

import { StagePill } from './StagePill'
import type { Lead, LeadStage } from '../lib/leads-store'

export interface LeadCardProps {
  lead: Lead
  isSelected?: boolean
  onSelect: (lead: Lead) => void
  onDelete: (lead: Lead) => void
  onStageChange: (id: string, stage: LeadStage) => void
}

/**
 * The small-screen counterpart to a `LeadsTable` row. A 7-column table is a
 * poor fit for a phone (either an unreadable horizontal scroll, or crushed
 * columns) — the well-established responsive pattern is to swap to a
 * card-per-record layout below a breakpoint instead of forcing the table to
 * cope, which is what `LeadsTable` does via `hidden sm:block` / `sm:hidden`.
 */
export function LeadCard({ lead, isSelected, onSelect, onDelete, onStageChange }: LeadCardProps) {
  return (
    <div className={cn('flex flex-col gap-2 border-b border-border p-4 last:border-0', isSelected && 'bg-muted/50')}>
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          className="min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => onSelect(lead)}
        >
          <p className="font-medium">{lead.name}</p>
          <p className="text-sm text-muted-foreground">{lead.company}</p>
        </button>
        <Button variant="ghost" size="icon" aria-label={`Delete ${lead.name}`} onClick={() => onDelete(lead)}>
          <Trash2 className="size-4" />
        </Button>
      </div>

      <button
        type="button"
        className="text-left text-sm text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => onSelect(lead)}
      >
        {lead.address}
      </button>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <StagePill stage={lead.stage} onChange={(stage) => onStageChange(lead.id, stage)} />
        <span className="text-xs text-muted-foreground">{lead.roofAgeYears} yr roof</span>
        {lead.distressFlag ? (
          <StatBadge tone="destructive" icon={<TriangleAlert className="size-3" />} label="Distressed" />
        ) : (
          <StatBadge tone="secondary" label="Normal" />
        )}
      </div>
    </div>
  )
}
