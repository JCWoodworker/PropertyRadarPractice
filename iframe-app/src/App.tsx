import { useEffect, useMemo, useRef, useState } from 'react'
import { EmptyState, ErrorState, LoadingState, OfflineBanner, Tabs, TabsContent, TabsList, TabsTrigger, Toaster } from '@parceliq/ui'
import { Search } from 'lucide-react'
import type { PropertyResult } from '@parceliq/embed-sdk'

import { PropertyCard } from './components/PropertyCard'
import { WatchlistPanel } from './components/WatchlistPanel'
import { useProperty } from './hooks/use-property'
import { useRpcBridge } from './hooks/use-rpc-bridge'
import { useSaveProperty, useSavedProperties, useRemoveSavedProperty } from './hooks/use-saved-properties'
import { fetchProperty } from './lib/geocode'
import { queryClient } from './lib/query-client'
import { applyTheme } from './lib/theme'

const DEFAULT_PREVIEW_ADDRESS = '1600 Pennsylvania Avenue NW, Washington, DC'
const DISTRESS_REASON = 'Visible roof damage reported during property lookup'

function App() {
  const isStandalone = useMemo(() => window.parent === window, [])
  const [currentAddress, setCurrentAddress] = useState<string | null>(
    isStandalone ? DEFAULT_PREVIEW_ADDRESS : null
  )
  const [flaggedAddresses, setFlaggedAddresses] = useState<Set<string>>(new Set())
  const rootRef = useRef<HTMLDivElement>(null)

  const { property, isLoading, isEmpty, isError, isOffline, error, refetch } = useProperty(currentAddress)
  const { savedProperties } = useSavedProperties()
  const saveMutation = useSaveProperty()
  const removeMutation = useRemoveSavedProperty()

  const notify = useRpcBridge((notify) => ({
    ping: () => ({ pong: true as const, timestamp: Date.now() }),
    setTheme: (theme) => {
      applyTheme(theme)
      return { ok: true as const }
    },
    loadProperty: async ({ address }) => {
      setCurrentAddress(address)
      const result: PropertyResult | null = await queryClient.fetchQuery({
        queryKey: ['property', address],
        queryFn: () => fetchProperty(address),
      })
      if (!result) {
        notify('error', { message: `No results found for "${address}"` })
        throw new Error(`No results found for "${address}"`)
      }
      notify('propertyLoaded', result)
      return result
    },
  }))

  // Report our own content height so the host can size the iframe without a scrollbar.
  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      notify('resize', { height: Math.ceil(entry.contentRect.height) })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [notify])

  const isSaved = property ? savedProperties.some((item) => item.address === property.address) : false
  // Flagged status is tracked by the *originally requested* address
  // (`currentAddress`), not `property.address` — see handleFlag below for why.
  const isFlagged = currentAddress ? flaggedAddresses.has(currentAddress) : false

  function handleFlag() {
    if (!property || !currentAddress) return
    // Report the address the host asked us to look up, not Nominatim's
    // geocoded/normalized `property.address` — the host's own records are
    // keyed by the address *it* knows, and those two strings essentially
    // never match exactly (Nominatim reformats/expands addresses). Sending
    // back `property.address` here would make `propertyFlagged` silently
    // match nothing on the host side.
    notify('propertyFlagged', { address: currentAddress, reason: DISTRESS_REASON })
    setFlaggedAddresses((prev) => new Set(prev).add(currentAddress))
  }

  return (
    <div ref={rootRef} className="min-h-screen bg-background p-4 text-foreground">
      {isStandalone ? (
        <div className="mb-3 rounded-md border border-dashed border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          Preview mode — normally this widget is loaded inside a host CRM via an iframe. Showing a default address.
        </div>
      ) : null}

      <Tabs defaultValue="lookup">
        <TabsList>
          <TabsTrigger value="lookup">Lookup</TabsTrigger>
          <TabsTrigger value="watchlist">Watchlist ({savedProperties.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="lookup">
          {!currentAddress ? (
            <EmptyState
              icon={<Search className="size-8" aria-hidden="true" />}
              title="Waiting for a property"
              description="This widget renders once the host CRM calls loadProperty(address)."
            />
          ) : null}

          {currentAddress && isLoading ? <LoadingState label="Looking up property…" lines={4} /> : null}

          {currentAddress && isEmpty ? (
            <EmptyState title="No results found" description={`Nominatim couldn't geocode "${currentAddress}".`} />
          ) : null}

          {currentAddress && isError ? (
            <ErrorState message={error?.message ?? 'Something went wrong looking up this property.'} onRetry={refetch} />
          ) : null}

          {property ? (
            <div className="flex flex-col gap-2">
              {isOffline ? <OfflineBanner /> : null}
              <PropertyCard
                property={property}
                isSaved={isSaved}
                isSaving={saveMutation.isPending}
                isFlagging={false}
                isFlagged={isFlagged}
                onSave={() => saveMutation.mutate({ property, reason: 'Manually saved from widget' })}
                onUnsave={() => removeMutation.mutate(property.address)}
                onFlag={handleFlag}
              />
            </div>
          ) : null}
        </TabsContent>

        <TabsContent value="watchlist">
          <WatchlistPanel />
        </TabsContent>
      </Tabs>

      <Toaster />
    </div>
  )
}

export default App
