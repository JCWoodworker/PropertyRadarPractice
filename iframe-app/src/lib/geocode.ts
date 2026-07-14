import type { PropertyResult } from '@parceliq/embed-sdk'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

/**
 * Looks up a property via the Nest backend's cached Nominatim proxy
 * (`GET /properties?address=...`) instead of calling Nominatim from the browser.
 *
 * Deliberate POC simplification: a real ParcelIQ widget vendor would run its
 * own separate backend from the host CRM. Here both apps share one API so we
 * can ship a real User-Agent, cache lookups in Postgres, and keep the demo
 * on one `docker compose` stack.
 */
export async function fetchProperty(address: string): Promise<PropertyResult | null> {
  const url = new URL(`${API_URL}/properties`)
  url.searchParams.set('address', address)

  const response = await fetch(url.toString())

  if (!response.ok) {
    throw new Error(`Property lookup failed with status ${response.status}`)
  }

  // Backend returns JSON `null` when Nominatim finds no match.
  return (await response.json()) as PropertyResult | null
}
