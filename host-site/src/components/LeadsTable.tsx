import { useState } from 'react'
import { Trash2, TriangleAlert } from 'lucide-react'
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
} from '@parceliq/ui'

import { StagePill } from './StagePill'
import type { Lead, LeadStage } from '../lib/leads-store'

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
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Property address</TableHead>
            <TableHead>Stage</TableHead>
            <TableHead>Roof age</TableHead>
            <TableHead>Status</TableHead>
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

            return (
              <TableRow key={lead.id} data-state={lead.id === selectedLeadId ? 'selected' : undefined}>
                <TableCell className="cursor-pointer font-medium" onClick={selectLead}>
                  {lead.name}
                </TableCell>
                <TableCell className="cursor-pointer" onClick={selectLead}>
                  {lead.company}
                </TableCell>
                <TableCell className="max-w-64 cursor-pointer truncate" title={lead.address} onClick={selectLead}>
                  {lead.address}
                </TableCell>
                <TableCell>
                  <StagePill stage={lead.stage} onChange={(stage) => onStageChange(lead.id, stage)} />
                </TableCell>
                <TableCell className="cursor-pointer" onClick={selectLead}>
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
