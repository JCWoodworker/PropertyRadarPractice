import * as React from 'react'

import { cn } from '../../lib/cn'

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        // `text-base` (16px) below the `sm` breakpoint, not `text-sm`:
        // iOS Safari auto-zooms the whole page on focus for any input with
        // a font-size under 16px, which is a jarring, well-known mobile
        // paper cut. Reverting to the tighter `text-sm` from `sm:` up is
        // safe since desktop browsers don't have that behavior.
        'flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm',
        className
      )}
      {...props}
    />
  )
)
Input.displayName = 'Input'
