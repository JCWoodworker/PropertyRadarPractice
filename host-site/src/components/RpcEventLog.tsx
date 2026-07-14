import { Radio } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, EmptyState, cn } from '@parceliq/ui'

import type { RpcLogEntry } from './ParcelIQEmbed'

export interface RpcEventLogProps {
  entries: RpcLogEntry[]
}

/**
 * Renders the exact JSON-RPC traffic flowing between this CRM and the
 * embedded widget, sourced from the SDK's own `onMessage` debug hook — not
 * a simulated log. This is the single best visual for showing the bridge
 * actually working.
 */
export function RpcEventLog({ entries }: RpcEventLogProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Radio className="size-4 text-primary" aria-hidden="true" />
          Live JSON-RPC Event Log
        </CardTitle>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <EmptyState
            icon={<Radio className="size-8" aria-hidden="true" />}
            title="No traffic yet"
            description="Select a lead to see JSON-RPC messages flow between the CRM and the widget."
          />
        ) : (
          <ul className="flex max-h-[28rem] flex-col gap-1.5 overflow-y-auto">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className={cn(
                  'rounded-md border px-2 py-1.5 font-mono text-[11px] leading-relaxed',
                  entry.direction === 'outgoing'
                    ? 'border-primary/30 bg-primary/5'
                    : 'border-success/30 bg-success/5'
                )}
              >
                <div className="mb-0.5 flex items-center justify-between gap-2 font-sans text-xs font-semibold">
                  <span>{entry.direction === 'outgoing' ? 'CRM \u2192 Widget' : 'Widget \u2192 CRM'}</span>
                  <span className="font-normal text-muted-foreground">
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <pre className="whitespace-pre-wrap break-all">{JSON.stringify(entry.message)}</pre>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
