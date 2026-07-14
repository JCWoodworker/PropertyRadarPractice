import { QueryClient } from '@tanstack/react-query'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { persistQueryClient } from '@tanstack/react-query-persist-client'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
})

/**
 * Persists the query cache to localStorage so a previously-loaded property
 * survives a reload and can be served as an offline fallback (see
 * `useProperty`) if a later fetch fails. This is the same "don't blank-screen
 * the user when the network drops" instinct behind the offline-capable
 * caching in the Woodworker's Companion app, applied here to the widget.
 */
if (typeof window !== 'undefined') {
  const persister = createSyncStoragePersister({
    storage: window.localStorage,
    key: 'parceliq.queryCache.v1',
  })

  void persistQueryClient({
    queryClient,
    persister,
    maxAge: 24 * 60 * 60 * 1000,
  })
}
