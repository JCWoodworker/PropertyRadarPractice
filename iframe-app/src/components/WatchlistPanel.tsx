import { Bookmark, Trash2 } from 'lucide-react'
import { Button, EmptyState, ErrorState, LoadingState } from '@parceliq/ui'

import { useRemoveSavedProperty, useSavedProperties } from '../hooks/use-saved-properties'

export function WatchlistPanel() {
  const { savedProperties, isLoading, isEmpty, isError, error, refetch } = useSavedProperties()
  const removeMutation = useRemoveSavedProperty()

  if (isLoading) return <LoadingState label="Loading watchlist…" lines={2} />
  if (isError) return <ErrorState message={error?.message ?? 'Failed to load your watchlist.'} onRetry={refetch} />
  if (isEmpty) {
    return (
      <EmptyState
        icon={<Bookmark className="size-8" aria-hidden="true" />}
        title="No saved properties yet"
        description="Use “Save to watchlist” on a property lookup to keep it here."
      />
    )
  }

  return (
    <ul className="flex flex-col gap-2">
      {savedProperties.map((item) => (
        <li key={item.address} className="flex items-start justify-between gap-2 rounded-lg border border-border p-3 text-sm">
          <div>
            <p className="font-medium">{item.address}</p>
            <p className="text-xs text-muted-foreground">{item.reason}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Remove ${item.address} from watchlist`}
            onClick={() => removeMutation.mutate(item.address)}
          >
            <Trash2 className="size-4" />
          </Button>
        </li>
      ))}
    </ul>
  )
}
