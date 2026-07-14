import { Skeleton } from './ui/skeleton'
import { cn } from '../lib/cn'

export interface LoadingStateProps {
  /** Number of skeleton rows/lines to render. */
  lines?: number
  className?: string
  label?: string
}

/** Shared loading treatment. Renders a few skeleton lines rather than a bare spinner, matching content shape. */
export function LoadingState({ lines = 3, className, label = 'Loading…' }: LoadingStateProps) {
  return (
    <div className={cn('flex flex-col gap-2', className)} role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton key={index} className={cn('h-4', index === lines - 1 ? 'w-2/3' : 'w-full')} />
      ))}
    </div>
  )
}
