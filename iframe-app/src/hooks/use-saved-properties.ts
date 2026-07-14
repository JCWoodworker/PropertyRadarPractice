import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { PropertyResult } from '@parceliq/embed-sdk'

import { listSavedProperties, removeSavedProperty, saveProperty, type SavedProperty } from '../lib/saved-properties-store'

const SAVED_PROPERTIES_KEY = ['savedProperties'] as const

export interface UseSavedPropertiesResult {
  savedProperties: SavedProperty[]
  isLoading: boolean
  isEmpty: boolean
  isError: boolean
  error: Error | null
  refetch: () => void
}

export function useSavedProperties(): UseSavedPropertiesResult {
  const query = useQuery({ queryKey: SAVED_PROPERTIES_KEY, queryFn: listSavedProperties })

  return {
    savedProperties: query.data ?? [],
    isLoading: query.isLoading,
    isEmpty: query.isSuccess && (query.data?.length ?? 0) === 0,
    isError: query.isError,
    error: query.error instanceof Error ? query.error : null,
    refetch: () => void query.refetch(),
  }
}

/** Adds/updates a saved property, then invalidates the list so it refetches. */
export function useSaveProperty() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ property, reason }: { property: PropertyResult; reason: string }) =>
      saveProperty(property, reason),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SAVED_PROPERTIES_KEY })
    },
  })
}

/** Removes a saved property by address, then invalidates the list so it refetches. */
export function useRemoveSavedProperty() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (address: string) => removeSavedProperty(address),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SAVED_PROPERTIES_KEY })
    },
  })
}
