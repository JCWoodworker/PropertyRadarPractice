import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import type { PropertyResult } from '@parceliq/embed-sdk'

import { createQueryWrapper, createTestQueryClient } from '../test/query-client-wrapper'
import { useRemoveSavedProperty, useSaveProperty, useSavedProperties } from './use-saved-properties'

const SAMPLE_PROPERTY: PropertyResult = {
  address: '123 Main St, Springfield, IL, USA',
  county: 'Sangamon County',
  state: 'Illinois',
  lat: 39.78,
  lon: -89.65,
  placeType: 'house',
}

describe('useSavedProperties + useSaveProperty + useRemoveSavedProperty', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('starts empty', async () => {
    const { result } = renderHook(() => useSavedProperties(), { wrapper: createQueryWrapper() })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.isEmpty).toBe(true)
    expect(result.current.savedProperties).toEqual([])
  })

  it('adding a property invalidates the list so it reappears with the new entry', async () => {
    const queryClient = createTestQueryClient()
    const wrapper = createQueryWrapper(queryClient)

    const { result: listResult } = renderHook(() => useSavedProperties(), { wrapper })
    const { result: saveResult } = renderHook(() => useSaveProperty(), { wrapper })

    await waitFor(() => expect(listResult.current.isLoading).toBe(false))

    saveResult.current.mutate({ property: SAMPLE_PROPERTY, reason: 'Manually saved from widget' })

    await waitFor(() => expect(listResult.current.savedProperties).toHaveLength(1))
    expect(listResult.current.savedProperties[0]).toMatchObject({
      address: SAMPLE_PROPERTY.address,
      reason: 'Manually saved from widget',
    })
  })

  it('removing a saved property invalidates the list so it disappears', async () => {
    const queryClient = createTestQueryClient()
    const wrapper = createQueryWrapper(queryClient)

    const { result: listResult } = renderHook(() => useSavedProperties(), { wrapper })
    const { result: saveResult } = renderHook(() => useSaveProperty(), { wrapper })
    const { result: removeResult } = renderHook(() => useRemoveSavedProperty(), { wrapper })

    await waitFor(() => expect(listResult.current.isLoading).toBe(false))
    saveResult.current.mutate({ property: SAMPLE_PROPERTY, reason: 'test' })
    await waitFor(() => expect(listResult.current.savedProperties).toHaveLength(1))

    removeResult.current.mutate(SAMPLE_PROPERTY.address)

    await waitFor(() => expect(listResult.current.isEmpty).toBe(true))
  })
})
