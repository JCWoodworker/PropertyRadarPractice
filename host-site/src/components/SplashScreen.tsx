import { useEffect, useState } from 'react'
import { Building, Building2, Home } from 'lucide-react'

export interface SplashScreenProps {
  /** Called once the exit fade has finished — the caller then swaps to the real app. */
  onDone: () => void
}

// Held for the full growth sequence, then fades out — total time on screen
// tops out at 4s exactly, matching the "about 4 seconds max" spec.
const EXIT_AT_MS = 3700
const DONE_AT_MS = 4000

/**
 * A brand splash shown once per hard refresh, before anything else in the
 * app mounts (see the early return in `App.tsx`). Deliberately app-specific
 * rather than a `@parceliq/ui` component — a splash is inherently a
 * one-off piece of brand illustration, not a generic composable pattern.
 *
 * The "growth" effect (house -> multi-family -> tower) is three stacked
 * lucide icons cross-fading and scaling in sequence on one shared CSS
 * timeline (see the `parceliq-grow-*` keyframes in index.css) — reusing the
 * same icon set as the rest of the app instead of hand-drawn SVGs keeps the
 * visual language consistent and avoids the complexity of real SVG path
 * morphing for what's ultimately a 4-second flourish.
 */
export function SplashScreen({ onDone }: SplashScreenProps) {
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    const exitTimer = setTimeout(() => setIsExiting(true), EXIT_AT_MS)
    const doneTimer = setTimeout(onDone, DONE_AT_MS)
    return () => {
      clearTimeout(exitTimer)
      clearTimeout(doneTimer)
    }
  }, [onDone])

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading RoofingFlow"
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-background text-foreground transition-opacity duration-300 ease-in-out ${
        isExiting ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div className="relative size-20 text-primary">
        <Home className="parceliq-splash-icon parceliq-splash-home size-16" strokeWidth={1.5} aria-hidden="true" />
        <Building2 className="parceliq-splash-icon parceliq-splash-multi size-16" strokeWidth={1.5} aria-hidden="true" />
        <Building className="parceliq-splash-icon parceliq-splash-tower size-16" strokeWidth={1.5} aria-hidden="true" />
      </div>

      <div className="flex flex-col items-center gap-2">
        <p className="text-sm font-medium tracking-wide text-muted-foreground">RoofingFlow</p>
        <div className="flex gap-1.5" aria-hidden="true">
          <span className="parceliq-splash-dot size-1.5 rounded-full bg-primary" />
          <span className="parceliq-splash-dot size-1.5 rounded-full bg-primary [animation-delay:0.15s]" />
          <span className="parceliq-splash-dot size-1.5 rounded-full bg-primary [animation-delay:0.3s]" />
        </div>
      </div>
    </div>
  )
}
