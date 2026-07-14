import { WifiOff } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from './ui/alert'

export interface OfflineBannerProps {
  message?: string
}

/**
 * Shown when a fetch fails but we're rendering a previously-cached result
 * instead of a bare error — the widget's offline-resilience fallback.
 */
export function OfflineBanner({
  message = 'You appear to be offline. Showing the last cached result for this address.',
}: OfflineBannerProps) {
  return (
    <Alert variant="success" className="mb-3">
      <WifiOff />
      <AlertTitle>Showing cached data</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  )
}
