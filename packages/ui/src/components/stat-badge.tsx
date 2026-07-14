import * as React from 'react'

import { Badge, type BadgeProps } from './ui/badge'

export interface StatBadgeProps extends Omit<BadgeProps, 'variant'> {
  label: string
  tone?: BadgeProps['variant']
  icon?: React.ReactNode
}

/** A labeled badge for at-a-glance stats/flags — e.g. the CRM's "Distressed" indicator. */
export function StatBadge({ label, tone = 'default', icon, ...props }: StatBadgeProps) {
  return (
    <Badge variant={tone} {...props}>
      {icon}
      {label}
    </Badge>
  )
}
