import { useState } from 'react'
import { ChevronUp, Radio } from 'lucide-react'
import { cn } from '@parceliq/ui'

import { RpcEventLog } from './RpcEventLog'
import type { RpcLogEntry } from './ParcelIQEmbed'

export interface EventLogDrawerProps {
  entries: RpcLogEntry[]
}

/**
 * A bottom-docked, collapsible drawer for the live JSON-RPC event log.
 * Fixed to the viewport (not part of page flow) so it overlays whatever is
 * currently at the bottom of the screen — which is why the leads table
 * scrolls in its own container (see App.tsx) rather than relying on page
 * scroll: rows can end up behind this drawer while it's open, and scrolling
 * the table itself is how you bring them back into view.
 */
export function EventLogDrawer({ entries }: EventLogDrawerProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex flex-col items-center">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        className="flex items-center gap-2 rounded-t-md border border-b-0 border-border bg-card px-4 py-1.5 text-xs font-medium text-foreground shadow-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Radio className="size-3.5 text-primary" aria-hidden="true" />
        Show Live JSON-RPC Event Log
        <ChevronUp className={cn('size-3.5 transition-transform', isOpen && 'rotate-180')} aria-hidden="true" />
      </button>

      <div
        className={cn(
          'w-full overflow-hidden border-t border-border bg-card shadow-[0_-4px_12px_rgba(0,0,0,0.08)] transition-[height] duration-200 ease-in-out',
          isOpen ? 'h-[22vh]' : 'h-0'
        )}
      >
        <div className="h-full overflow-y-auto p-3">
          <RpcEventLog entries={entries} />
        </div>
      </div>
    </div>
  )
}
