import * as React from 'react'

import { cn } from '../lib/cn'

export interface PageHeaderProps {
  title: string
  description?: string
  actions?: React.ReactNode
  className?: string
}

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    // Below `sm`, title/description and actions stack full-width instead
    // of squeezing onto one row — on a narrow phone, a wrapped row of
    // controls next to a long description reads as cluttered, not compact.
    <div className={cn('flex flex-col items-start gap-3 sm:flex-row sm:items-start sm:justify-between', className)}>
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">{actions}</div> : null}
    </div>
  )
}
