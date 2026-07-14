import type * as React from 'react'

export interface StatRowProps {
  label: string
  value: string
  icon?: React.ReactNode
}

export function StatRow({ label, value, icon }: StatRowProps) {
  return (
    <div className="flex items-center justify-between border-b border-border/60 py-1.5 text-sm last:border-0">
      <span className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className="font-medium">{value}</span>
    </div>
  )
}
