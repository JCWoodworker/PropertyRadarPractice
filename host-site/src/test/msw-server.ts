import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'

import type { Lead, LeadStage, NewLeadInput, PaginatedLeads } from '../lib/leads-store'
import { LEADS_PAGE_SIZE } from '../lib/leads-store'

const API_URL = 'http://localhost:3000'

const INITIAL_LEADS: Lead[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Dana Whitfield',
    company: 'Whitfield Family Home',
    address: '1600 Pennsylvania Avenue NW, Washington, DC',
    stage: 'Needs Estimate',
    roofAgeYears: 22,
    roofMaterial: 'Asphalt Shingle',
    lastInspection: '2025-02-18',
    distressFlag: false,
    distressReason: null,
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'Marcus Ortiz',
    company: 'Ortiz Rental Properties',
    address: '350 Fifth Avenue, New York, NY',
    stage: 'Scheduled',
    roofAgeYears: 8,
    roofMaterial: 'Membrane (TPO)',
    lastInspection: '2025-11-03',
    distressFlag: false,
    distressReason: null,
  },
]

let leads: Lead[] = INITIAL_LEADS.map((lead) => ({ ...lead }))

/** Test-only: restores the MSW-backed leads fixture so tests don't leak state. */
export function __resetLeadsForTests(): void {
  leads = INITIAL_LEADS.map((lead) => ({ ...lead }))
}

function paginate(page: number, limit: number): PaginatedLeads {
  const total = leads.length
  const start = (page - 1) * limit
  const data = leads.slice(start, start + limit)
  return {
    data,
    page,
    limit,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / limit),
  }
}

export const leadsHandlers = [
  http.get(`${API_URL}/leads`, ({ request }) => {
    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page') ?? '1')
    const limit = Number(url.searchParams.get('limit') ?? String(LEADS_PAGE_SIZE))
    return HttpResponse.json(paginate(page, limit))
  }),

  http.post(`${API_URL}/leads`, async ({ request }) => {
    const input = (await request.json()) as NewLeadInput
    const lead: Lead = {
      ...input,
      id: crypto.randomUUID(),
      distressFlag: false,
      distressReason: null,
    }
    leads = [lead, ...leads]
    return HttpResponse.json(lead, { status: 201 })
  }),

  http.delete(`${API_URL}/leads/:id`, ({ params }) => {
    leads = leads.filter((lead) => lead.id !== params.id)
    return HttpResponse.json({ id: params.id })
  }),

  http.patch(`${API_URL}/leads/:id/stage`, async ({ params, request }) => {
    const body = (await request.json()) as { stage: LeadStage }
    let updated: Lead | undefined
    leads = leads.map((lead) => {
      if (lead.id !== params.id) return lead
      updated = { ...lead, stage: body.stage }
      return updated
    })
    return HttpResponse.json(updated)
  }),

  http.post(`${API_URL}/leads/flag`, async ({ request }) => {
    const body = (await request.json()) as { address: string; reason: string }
    const flagged: Lead[] = []
    leads = leads.map((lead) => {
      if (lead.address !== body.address) return lead
      const next = { ...lead, distressFlag: true, distressReason: body.reason }
      flagged.push(next)
      return next
    })
    return HttpResponse.json(flagged, { status: 201 })
  }),
]

export const server = setupServer(...leadsHandlers)
