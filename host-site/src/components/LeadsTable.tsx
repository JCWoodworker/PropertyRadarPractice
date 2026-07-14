import { Trash2, TriangleAlert } from 'lucide-react'
import {
  Button,
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

import type { Lead } from '../lib/leads-store'

export interface LeadsTableProps {
  leads: Lead[]
  isLoading: boolean
  isEmpty: boolean
  isError: boolean
  error: Error | null
  onRetry: () => void
  onSelect: (lead: Lead) => void
  onDelete: (id: string) => void
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
  selectedLeadId,
}: LeadsTableProps) {
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
        {leads.map((lead) => (
          <TableRow
            key={lead.id}
            data-state={lead.id === selectedLeadId ? 'selected' : undefined}
            className="cursor-pointer"
            onClick={() => onSelect(lead)}
          >
            <TableCell className="font-medium">{lead.name}</TableCell>
            <TableCell>{lead.company}</TableCell>
            <TableCell className="max-w-64 truncate" title={lead.address}>
              {lead.address}
            </TableCell>
            <TableCell>{lead.stage}</TableCell>
            <TableCell>{lead.roofAgeYears} yrs</TableCell>
            <TableCell>
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
                onClick={(event) => {
                  event.stopPropagation()
                  onDelete(lead.id)
                }}
              >
                <Trash2 className="size-4" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
