export type LeadStage = 'Needs Estimate' | 'Scheduled' | 'Quoted' | 'Won' | 'Lost'

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

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Leads API ${response.status}: ${body || response.statusText}`)
  }
  return response.json() as Promise<T>
}

/** Fetches one page of leads from the Nest backend (newest first). */
export async function listLeads(page = 1, limit = LEADS_PAGE_SIZE): Promise<PaginatedLeads> {
  const url = new URL(`${API_URL}/leads`)
  url.searchParams.set('page', String(page))
  url.searchParams.set('limit', String(limit))
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
