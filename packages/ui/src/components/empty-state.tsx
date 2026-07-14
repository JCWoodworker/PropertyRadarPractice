import * as React from 'react'
import { Inbox } from 'lucide-react'

import { cn } from '../lib/cn'

export interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

/** Shared "nothing here" treatment — used by both the CRM's leads table and the widget's property lookup. */
export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border px-6 py-10 text-center',
        className
      )}
    >
      <div className="mb-1 text-muted-foreground">{icon ?? <Inbox className="size-8" aria-hidden="true" />}</div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description ? <p className="max-w-sm text-sm text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  )
}
