import { useQuery } from '@tanstack/react-query'
import type { PropertyResult } from '@parceliq/embed-sdk'

import { fetchProperty } from '../lib/geocode'

export interface UsePropertyResult {
  property: PropertyResult | null
  isLoading: boolean
  isEmpty: boolean
  isError: boolean
  /** True when the fetch failed but we're still showing a previously-cached result for this address. */
  isOffline: boolean
  error: Error | null
  refetch: () => void
}

/**
 * Fetches a property by address, folding loading/empty/error/offline states
 * into one return shape (per project convention — see
 * `.cursor/rules/data-fetching.mdc`). `isEmpty` and `isOffline` are distinct:
 * "empty" means Nominatim found nothing; "offline" means a request failed
 * but we still have a previously-cached result to fall back to.
 */
export function useProperty(address: string | null): UsePropertyResult {
  const query = useQuery({
    queryKey: ['property', address],
    queryFn: () => fetchProperty(address as string),
    enabled: Boolean(address),
  })

  const isOffline = query.isError && query.data !== undefined

  return {
    property: query.data ?? null,
    isLoading: query.isLoading,
    isEmpty: query.isSuccess && query.data === null,
    isError: query.isError && !isOffline,
    isOffline,
    error: query.error instanceof Error ? query.error : null,
    refetch: () => void query.refetch(),
  }
}
