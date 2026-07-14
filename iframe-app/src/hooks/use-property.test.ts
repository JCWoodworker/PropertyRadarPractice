import { renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it } from 'vitest'

import { server } from '../test/msw-server'
import { createQueryWrapper, createTestQueryClient } from '../test/query-client-wrapper'
import { useProperty } from './use-property'

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'

function mockNominatimSuccess() {
  server.use(
    http.get(NOMINATIM_URL, () =>
      HttpResponse.json([
        {
          display_name: '123 Main St, Springfield, IL, USA',
          lat: '39.78',
          lon: '-89.65',
          type: 'house',
          address: { county: 'Sangamon County', state: 'Illinois' },
        },
      ])
    )
  )
}

function mockNominatimEmpty() {
  server.use(http.get(NOMINATIM_URL, () => HttpResponse.json([])))
}

function mockNominatimFailure() {
  server.use(http.get(NOMINATIM_URL, () => HttpResponse.error()))
}

describe('useProperty', () => {
  afterEach(() => {
    server.resetHandlers()
  })

  it('starts in a loading state and resolves to the geocoded property', async () => {
    mockNominatimSuccess()
    const { result } = renderHook(() => useProperty('123 Main St'), { wrapper: createQueryWrapper() })

    expect(result.current.isLoading).toBe(true)

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.property).toEqual({
      address: '123 Main St, Springfield, IL, USA',
      county: 'Sangamon County',
      state: 'Illinois',
      lat: 39.78,
      lon: -89.65,
      placeType: 'house',
    })
    expect(result.current.isEmpty).toBe(false)
    expect(result.current.isError).toBe(false)
  })

  it('is disabled (does not fetch) when address is null', () => {
    const { result } = renderHook(() => useProperty(null), { wrapper: createQueryWrapper() })
    expect(result.current.isLoading).toBe(false)
    expect(result.current.property).toBeNull()
  })

  it('reports isEmpty when Nominatim returns zero results', async () => {
    mockNominatimEmpty()
    const { result } = renderHook(() => useProperty('nowhere at all'), { wrapper: createQueryWrapper() })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.isEmpty).toBe(true)
    expect(result.current.isError).toBe(false)
    expect(result.current.property).toBeNull()
  })

  it('reports isError (not isOffline) when there is no prior cached value', async () => {
    mockNominatimFailure()
    const { result } = renderHook(() => useProperty('123 Main St'), { wrapper: createQueryWrapper() })

    await waitFor(() => expect(result.current.isError || result.current.isOffline).toBe(true))

    expect(result.current.isError).toBe(true)
    expect(result.current.isOffline).toBe(false)
  })

  it('falls back to cached data with isOffline when a later fetch for the same address fails', async () => {
    const queryClient = createTestQueryClient()
    const wrapper = createQueryWrapper(queryClient)

    mockNominatimSuccess()
    const { result, rerender } = renderHook(() => useProperty('123 Main St'), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.property).not.toBeNull()

    mockNominatimFailure()
    await queryClient.invalidateQueries({ queryKey: ['property', '123 Main St'] })
    rerender()

    await waitFor(() => expect(result.current.isOffline).toBe(true))
    expect(result.current.property).not.toBeNull()
    expect(result.current.isError).toBe(false)
  })
})
