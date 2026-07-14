export interface PropertySuggestion {
  address: string
  county: string | null
  state: string | null
  lat: number
  lon: number
  placeType: string
}

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

/**
 * Address autocomplete for the "Add lead" form — hits the Nest backend's
 * uncached, multi-result `GET /properties/suggest` proxy (distinct from
 * `iframe-app`'s single-result `GET /properties` widget lookup).
 */
export async function suggestAddresses(query: string): Promise<PropertySuggestion[]> {
  const url = new URL(`${API_URL}/properties/suggest`)
  url.searchParams.set('q', query)

  const response = await fetch(url.toString())
  if (!response.ok) {
    throw new Error(`Address suggestion failed with status ${response.status}`)
  }
  return (await response.json()) as PropertySuggestion[]
}
