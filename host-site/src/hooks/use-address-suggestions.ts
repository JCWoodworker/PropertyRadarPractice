import { useQuery } from '@tanstack/react-query'

import { useDebouncedValue } from './use-debounced-value'
import { suggestAddresses, type PropertySuggestion } from '../lib/property-suggest'

export const MIN_ADDRESS_QUERY_LENGTH = 3

// A single stable reference for the "no suggestions" case — returning a
// fresh `[]` literal every render would change identity each time even when
// nothing meaningful changed, which breaks reference-equality checks like
// the one `AddressAutocomplete` uses to reset its highlighted index.
const EMPTY_SUGGESTIONS: PropertySuggestion[] = []

export interface UseAddressSuggestionsResult {
  suggestions: PropertySuggestion[]
  isLoading: boolean
  isError: boolean
}

/**
 * Debounces `query` before hitting `GET /properties/suggest`, so typing
 * doesn't fire a request per keystroke — see `.cursor/rules/data-fetching.mdc`
 * for why this lives in its own hook rather than being called from
 * `AddressAutocomplete` directly.
 */
export function useAddressSuggestions(query: string): UseAddressSuggestionsResult {
  const debounced = useDebouncedValue(query.trim(), 350)
  const enabled = debounced.length >= MIN_ADDRESS_QUERY_LENGTH

  const result = useQuery({
    queryKey: ['property-suggestions', debounced],
    queryFn: () => suggestAddresses(debounced),
    enabled,
    staleTime: 60_000,
  })

  return {
    suggestions: enabled ? result.data ?? EMPTY_SUGGESTIONS : EMPTY_SUGGESTIONS,
    isLoading: enabled && result.isLoading,
    isError: enabled && result.isError,
  }
}
