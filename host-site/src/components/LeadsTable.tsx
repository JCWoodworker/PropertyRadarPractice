import { useState } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown, Trash2, TriangleAlert } from 'lucide-react'
import {
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  LoadingState,
  StatBadge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  cn,
} from '@parceliq/ui'

import { LeadCard } from './LeadCard'
import { StagePill } from './StagePill'
import { getStateFromAddress, type Lead, type LeadSortField, type LeadStage, type SortOrder } from '../lib/leads-store'

export interface LeadsTableProps {
  leads: Lead[]
  isLoading: boolean
  isEmpty: boolean
  isError: boolean
  error: Error | null
  onRetry: () => void
  onSelect: (lead: Lead) => void
  onDelete: (id: string) => void
  onStageChange: (id: string, stage: LeadStage) => void
  selectedLeadId?: string | null
  sortBy?: LeadSortField
  sortOrder?: SortOrder
  onSortChange?: (sortBy: LeadSortField, sortOrder: SortOrder) => void
}

/** A `TableHead` whose label is a button that toggles sort on click — ascending on a new field, flipped direction on a re-click of the active one. */
function SortableHead({
  field,
  label,
  sortBy,
  sortOrder,
  onSortChange,
  className,
}: {
  field: LeadSortField
  label: string
  sortBy?: LeadSortField
  sortOrder?: SortOrder
  onSortChange?: (sortBy: LeadSortField, sortOrder: SortOrder) => void
  className?: string
}) {
  const isActive = sortBy === field
  const Icon = isActive ? (sortOrder === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown

  return (
    <TableHead className={className}>
      <button
        type="button"
        className="inline-flex items-center gap-1 rounded text-xs font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => onSortChange?.(field, isActive && sortOrder === 'asc' ? 'desc' : 'asc')}
      >
        {label}
        <Icon className={cn('size-3', !isActive && 'opacity-50')} aria-hidden="true" />
      </button>
    </TableHead>
  )
}

export function LeadsTable({
  leads,
  isLoading,
  isEmpty,
  isError,
  error,
  onRetry,
  onSelect,
  onDelete,
  onStageChange,
  selectedLeadId,
  sortBy,
  sortOrder,
  onSortChange,
}: LeadsTableProps) {
  const [pendingDelete, setPendingDelete] = useState<Lead | null>(null)

  if (isLoading) return <LoadingState label="Loading leads…" lines={5} className="p-4" />
  if (isError) {
    return (
      <div className="p-4">
        <ErrorState message={error?.message ?? 'Failed to load leads.'} onRetry={onRetry} />
      </div>
    )
  }
  if (isEmpty) {
    return (
      <EmptyState
        className="border-none"
        title="No leads yet"
        description="Add your first roofing lead to get started."
      />
    )
  }

  return (
    <>
      {/* Card list below `sm` — see LeadCard for why. */}
      <div className="sm:hidden" data-testid="lead-cards">
        {leads.map((lead) => (
          <LeadCard
            key={lead.id}
            lead={lead}
            isSelected={lead.id === selectedLeadId}
            onSelect={onSelect}
            onDelete={setPendingDelete}
            onStageChange={onStageChange}
          />
        ))}
      </div>

      <Table className="hidden sm:table">
        <TableHeader>
          <TableRow>
            <SortableHead field="name" label="Name" sortBy={sortBy} sortOrder={sortOrder} onSortChange={onSortChange} />
            {/* Company, State, and Roof age are progressively hidden at
                narrower widths rather than forcing horizontal scroll on the
                whole table — the columns that matter most for scanning a
                lead (name, address, stage, status, actions) always stay
                visible without scrolling; the rest reappear as there's more
                room. */}
            <SortableHead
              field="company"
              label="Company"
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSortChange={onSortChange}
              className="hidden lg:table-cell"
            />
            <SortableHead field="address" label="Property address" sortBy={sortBy} sortOrder={sortOrder} onSortChange={onSortChange} />
            <TableHead className="hidden xl:table-cell">State</TableHead>
            <SortableHead field="stage" label="Stage" sortBy={sortBy} sortOrder={sortOrder} onSortChange={onSortChange} />
            <SortableHead
              field="roofAgeYears"
              label="Roof age"
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSortChange={onSortChange}
              className="hidden md:table-cell"
            />
            <SortableHead field="distressFlag" label="Status" sortBy={sortBy} sortOrder={sortOrder} onSortChange={onSortChange} />
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead) => {
            // Row "selection" is attached per-cell rather than to the whole
            // <TableRow>, deliberately: the Stage cell now contains a
            // dropdown whose menu content renders through a portal. React
            // still bubbles synthetic events from portaled content up
            // through the *component* tree (not the DOM tree), so a
            // row-level onClick would otherwise fire onSelect every time a
            // stage option is picked. Scoping the click handler to the
            // non-interactive cells avoids that entirely instead of fighting
            // it with stopPropagation calls.
            const selectLead = () => onSelect(lead)
            const state = getStateFromAddress(lead.address)

            return (
              <TableRow key={lead.id} data-state={lead.id === selectedLeadId ? 'selected' : undefined}>
                <TableCell className="cursor-pointer font-medium" onClick={selectLead}>
                  {lead.name}
                </TableCell>
                <TableCell className="hidden cursor-pointer lg:table-cell" onClick={selectLead}>
                  {lead.company}
                </TableCell>
                <TableCell className="max-w-48 cursor-pointer truncate lg:max-w-64" title={lead.address} onClick={selectLead}>
                  {lead.address}
                </TableCell>
                <TableCell className="hidden cursor-pointer xl:table-cell" onClick={selectLead}>
                  {state ?? '—'}
                </TableCell>
                <TableCell>
                  <StagePill stage={lead.stage} onChange={(stage) => onStageChange(lead.id, stage)} />
                </TableCell>
                <TableCell className="hidden cursor-pointer md:table-cell" onClick={selectLead}>
                  {lead.roofAgeYears} yrs
                </TableCell>
                <TableCell className="cursor-pointer" onClick={selectLead}>
                  {lead.distressFlag ? (
                    <StatBadge tone="destructive" icon={<TriangleAlert className="size-3" />} label="Distressed" />
                  ) : (
                    <StatBadge tone="secondary" label="Normal" />
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Delete ${lead.name}`}
                    onClick={() => setPendingDelete(lead)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        variant="destructive"
        title="Delete this lead?"
        description={
          pendingDelete
            ? `This will permanently remove ${pendingDelete.name} (${pendingDelete.address}) from RoofingFlow CRM. This can't be undone.`
            : undefined
        }
        confirmLabel="Delete lead"
        onConfirm={() => {
          if (pendingDelete) onDelete(pendingDelete.id)
          setPendingDelete(null)
        }}
      />
    </>
  )
}
