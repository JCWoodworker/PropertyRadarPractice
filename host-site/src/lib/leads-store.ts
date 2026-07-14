export type LeadStage = 'Needs Estimate' | 'Scheduled' | 'Quoted' | 'Won' | 'Lost'

export type LeadSortField = 'name' | 'company' | 'address' | 'stage' | 'roofAgeYears' | 'distressFlag' | 'createdAt'

export type SortOrder = 'asc' | 'desc'

export interface Lead {
  id: string
  name: string
  company: string
  address: string
  stage: LeadStage
  roofAgeYears: number
  roofMaterial: string
  lastInspection: string
  distressFlag: boolean
  distressReason: string | null
}

export type NewLeadInput = Omit<Lead, 'id' | 'distressFlag' | 'distressReason'>

export interface PaginatedLeads {
  data: Lead[]
  page: number
  limit: number
  total: number
  totalPages: number
}

export const LEADS_PAGE_SIZE = 25

/** Everything `GET /leads` accepts as a query param — see `ListLeadsQueryDto` on the backend. */
export interface ListLeadsParams {
  page: number
  limit?: number
  sortBy?: LeadSortField
  sortOrder?: SortOrder
  stage?: LeadStage
  roofAgeMin?: number
  roofAgeMax?: number
  state?: string
  search?: string
}

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Leads API ${response.status}: ${body || response.statusText}`)
  }
  return response.json() as Promise<T>
}

/**
 * Real addresses in this app are always formatted `"..., City, ST"` (see
 * the Prisma seed) — the trailing two-letter segment after the last comma
 * is the state. Purely a display helper for the table's derived State
 * column; the backend filters the same way (see `LeadsService.buildWhere`).
 */
export function getStateFromAddress(address: string): string | null {
  const parts = address.split(',')
  const last = parts[parts.length - 1]?.trim()
  return last && /^[A-Za-z]{2}$/.test(last) ? last.toUpperCase() : null
}

/** Fetches one page of leads from the Nest backend, with optional sort/filter/search. */
export async function listLeads(params: ListLeadsParams): Promise<PaginatedLeads> {
  const url = new URL(`${API_URL}/leads`)
  url.searchParams.set('page', String(params.page))
  url.searchParams.set('limit', String(params.limit ?? LEADS_PAGE_SIZE))
  if (params.sortBy) url.searchParams.set('sortBy', params.sortBy)
  if (params.sortOrder) url.searchParams.set('sortOrder', params.sortOrder)
  if (params.stage) url.searchParams.set('stage', params.stage)
  if (params.roofAgeMin !== undefined) url.searchParams.set('roofAgeMin', String(params.roofAgeMin))
  if (params.roofAgeMax !== undefined) url.searchParams.set('roofAgeMax', String(params.roofAgeMax))
  if (params.state) url.searchParams.set('state', params.state)
  if (params.search) url.searchParams.set('search', params.search)

  const response = await fetch(url.toString())
  return parseJson<PaginatedLeads>(response)
}

export async function addLead(input: NewLeadInput): Promise<Lead> {
  const response = await fetch(`${API_URL}/leads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return parseJson<Lead>(response)
}

export async function deleteLead(id: string): Promise<{ id: string }> {
  const response = await fetch(`${API_URL}/leads/${id}`, { method: 'DELETE' })
  return parseJson<{ id: string }>(response)
}

/** Marks the lead matching this property address as distressed — called when the widget's `propertyFlagged` event fires. */
export async function flagLeadByAddress(address: string, reason: string): Promise<Lead[]> {
  const response = await fetch(`${API_URL}/leads/flag`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address, reason }),
  })
  return parseJson<Lead[]>(response)
}

/** Updates a single lead's pipeline stage — called from the Stage pill's dropdown in the leads table. */
export async function updateLeadStage(id: string, stage: LeadStage): Promise<Lead> {
  const response = await fetch(`${API_URL}/leads/${id}/stage`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stage }),
  })
  return parseJson<Lead>(response)
}
