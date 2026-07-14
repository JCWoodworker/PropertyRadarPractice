import { Trash2, TriangleAlert } from 'lucide-react'
import type { ThemeOptions } from '@parceliq/embed-sdk'
import { Badge, Button, Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, StatBadge } from '@parceliq/ui'

import { ParcelIQEmbed, type RpcLogEntry } from './ParcelIQEmbed'
import type { Lead } from '../lib/leads-store'

export interface LeadDetailSheetProps {
  lead: Lead | null
  theme: ThemeOptions
  onOpenChange: (open: boolean) => void
  onDelete: (id: string) => void
  onFlagged: (address: string, reason: string) => void
  onLog: (entry: RpcLogEntry) => void
}

export function LeadDetailSheet({ lead, theme, onOpenChange, onDelete, onFlagged, onLog }: LeadDetailSheetProps) {
  return (
    <Sheet open={Boolean(lead)} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        {lead ? (
          <>
            <SheetHeader>
              <SheetTitle>{lead.name}</SheetTitle>
              <SheetDescription>{lead.company}</SheetDescription>
            </SheetHeader>

            <div className="mt-4 flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{lead.stage}</Badge>
                <Badge variant="outline">{lead.roofMaterial}</Badge>
                <Badge variant="outline">{lead.roofAgeYears} yr roof</Badge>
                {lead.distressFlag ? (
                  <StatBadge
                    tone="destructive"
                    icon={<TriangleAlert className="size-3" />}
                    label={lead.distressReason ?? 'Distressed'}
                  />
                ) : null}
              </div>

              <ParcelIQEmbed key={lead.id} address={lead.address} theme={theme} onFlagged={onFlagged} onLog={onLog} />

              <Button variant="outline" size="sm" className="self-start" onClick={() => onDelete(lead.id)}>
                <Trash2 className="size-4" />
                Delete lead
              </Button>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
