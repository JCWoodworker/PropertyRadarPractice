import type { PropertyResult } from '@parceliq/embed-sdk'

const NOMINATIM_ENDPOINT = 'https://nominatim.openstreetmap.org/search'

interface NominatimResult {
  display_name: string
  lat: string
  lon: string
  type: string
  address?: {
    county?: string
    state?: string
  }
}

/**
 * Geocodes an address via OpenStreetMap's free Nominatim API (no key required).
 *
 * Note: browsers forbid overriding the `User-Agent` header from `fetch`, so
 * unlike a server-side integration we can't send the descriptive UA
 * Nominatim's usage policy asks for — acceptable for this local demo's light
 * usage, but a production version would proxy this call through our own
 * backend (which is also where we'd swap in a paid property-data API).
 */
export async function fetchProperty(address: string): Promise<PropertyResult | null> {
  const url = new URL(NOMINATIM_ENDPOINT)
  url.searchParams.set('q', address)
  url.searchParams.set('format', 'json')
  url.searchParams.set('addressdetails', '1')
  url.searchParams.set('limit', '1')

  const response = await fetch(url.toString())

  if (!response.ok) {
    throw new Error(`Nominatim request failed with status ${response.status}`)
  }

  const results = (await response.json()) as NominatimResult[]
  if (results.length === 0) {
    return null
  }

  const [top] = results
  return {
    address: top.display_name,
    county: top.address?.county ?? null,
    state: top.address?.state ?? null,
    lat: Number(top.lat),
    lon: Number(top.lon),
    placeType: top.type,
  }
}
