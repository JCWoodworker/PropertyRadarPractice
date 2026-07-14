import { ServiceUnavailableException } from '@nestjs/common'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { PropertiesService } from './properties.service'

describe('PropertiesService', () => {
  const prisma = {
    propertyLookupCache: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  }

  const config = {
    get: vi.fn().mockReturnValue('ParcelIQ-POC/1.0 (test)'),
  }

  let service: PropertiesService
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    config.get.mockReturnValue('ParcelIQ-POC/1.0 (test)')
    service = new PropertiesService(prisma as never, config as never)
    vi.stubGlobal('fetch', fetchMock)
  })

  it('returns a cache hit without calling Nominatim', async () => {
    prisma.propertyLookupCache.findUnique.mockResolvedValue({
      queryAddress: '123 Main St',
      formattedAddress: '123 Main Street, Springfield, IL',
      county: 'Sangamon County',
      state: 'Illinois',
      lat: 39.78,
      lon: -89.65,
      placeType: 'house',
    })

    const result = await service.lookup('123 Main St')

    expect(fetchMock).not.toHaveBeenCalled()
    expect(result).toEqual({
      address: '123 Main Street, Springfield, IL',
      county: 'Sangamon County',
      state: 'Illinois',
      lat: 39.78,
      lon: -89.65,
      placeType: 'house',
    })
  })

  it('fetches Nominatim on cache miss and stores the result', async () => {
    prisma.propertyLookupCache.findUnique.mockResolvedValue(null)
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [
        {
          display_name: '123 Main Street, Springfield, IL, USA',
          lat: '39.78',
          lon: '-89.65',
          type: 'house',
          address: { county: 'Sangamon County', state: 'Illinois' },
        },
      ],
    })
    prisma.propertyLookupCache.create.mockResolvedValue({})

    const result = await service.lookup('123 Main St')

    expect(fetchMock).toHaveBeenCalled()
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(init.headers).toMatchObject({
      'User-Agent': 'ParcelIQ-POC/1.0 (test)',
    })
    expect(prisma.propertyLookupCache.create).toHaveBeenCalled()
    expect(result?.address).toBe('123 Main Street, Springfield, IL, USA')
  })

  it('returns null when Nominatim finds nothing', async () => {
    prisma.propertyLookupCache.findUnique.mockResolvedValue(null)
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [],
    })

    const result = await service.lookup('nowhere')

    expect(result).toBeNull()
    expect(prisma.propertyLookupCache.create).not.toHaveBeenCalled()
  })

  it('throws ServiceUnavailableException when Nominatim is down', async () => {
    prisma.propertyLookupCache.findUnique.mockResolvedValue(null)
    fetchMock.mockRejectedValue(new Error('network'))

    await expect(service.lookup('123 Main St')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    )
  })
})
