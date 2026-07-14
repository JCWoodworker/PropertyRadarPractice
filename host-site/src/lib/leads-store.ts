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

/**
 * A small in-memory mock "API" standing in for a real backend, wrapped in
 * an artificial delay so the CRM's `useLeads` hook has real loading states
 * to exercise (rather than resolving synchronously).
 */
const INITIAL_LEADS: Lead[] = [
  {
    id: 'l1',
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
    id: 'l2',
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
  {
    id: 'l3',
    name: 'Priya Chandra',
    company: 'Chandra Holdings LLC',
    address: '233 S Wacker Dr, Chicago, IL',
    stage: 'Quoted',
    roofAgeYears: 15,
    roofMaterial: 'Metal',
    lastInspection: '2025-08-22',
    distressFlag: false,
    distressReason: null,
  },
  {
    id: 'l4',
    name: 'Ben Ferreira',
    company: 'Ferreira Residence',
    address: '1 Infinite Loop, Cupertino, CA',
    stage: 'Won',
    roofAgeYears: 4,
    roofMaterial: 'Tile',
    lastInspection: '2026-01-10',
    distressFlag: false,
    distressReason: null,
  },
  {
    id: 'l5',
    name: 'Sam Okafor',
    company: 'Okafor & Sons',
    address: '600 Congress Ave, Austin, TX',
    stage: 'Needs Estimate',
    roofAgeYears: 27,
    roofMaterial: 'Asphalt Shingle',
    lastInspection: '2024-09-30',
    distressFlag: false,
    distressReason: null,
  },
  {
    id: 'l6',
    name: 'Lena Kowalski',
    company: 'Kowalski Duplex',
    address: '1 World Trade Center, New York, NY',
    stage: 'Lost',
    roofAgeYears: 12,
    roofMaterial: 'Slate',
    lastInspection: '2025-05-06',
    distressFlag: false,
    distressReason: null,
  },
  {
    id: 'l7',
    name: 'Theo Marsh',
    company: 'Marsh Property Group',
    address: '4059 Mt Lee Dr, Los Angeles, CA',
    stage: 'Scheduled',
    roofAgeYears: 19,
    roofMaterial: 'Wood Shake',
    lastInspection: '2025-06-19',
    distressFlag: false,
    distressReason: null,
  },
]

let leads: Lead[] = INITIAL_LEADS.map((lead) => ({ ...lead }))

/** Test-only: restores the mock store to its seed data so tests don't leak state into each other. */
export function __resetLeadsForTests(): void {
  leads = INITIAL_LEADS.map((lead) => ({ ...lead }))
}

// Kept snappy under Vitest so the test suite isn't paying for the artificial
// UX delay that makes the real dev app's loading states visible.
const SIMULATED_LATENCY_MS = import.meta.env.MODE === 'test' ? 0 : 350

function delay<T>(value: T, ms = SIMULATED_LATENCY_MS): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

export async function listLeads(): Promise<Lead[]> {
  return delay([...leads])
}

export type NewLeadInput = Omit<Lead, 'id' | 'distressFlag' | 'distressReason'>

export async function addLead(input: NewLeadInput): Promise<Lead[]> {
  const lead: Lead = { ...input, id: crypto.randomUUID(), distressFlag: false, distressReason: null }
  leads = [lead, ...leads]
  return delay([...leads])
}

export async function deleteLead(id: string): Promise<Lead[]> {
  leads = leads.filter((lead) => lead.id !== id)
  return delay([...leads])
}

/** Marks the lead matching this property address as distressed — called when the widget's `propertyFlagged` event fires. */
export async function flagLeadByAddress(address: string, reason: string): Promise<Lead[]> {
  leads = leads.map((lead) => (lead.address === address ? { ...lead, distressFlag: true, distressReason: reason } : lead))
  return delay([...leads])
}

/** Updates a single lead's pipeline stage — called from the Stage pill's dropdown in the leads table. */
export async function updateLeadStage(id: string, stage: LeadStage): Promise<Lead[]> {
  leads = leads.map((lead) => (lead.id === id ? { ...lead, stage } : lead))
  return delay([...leads])
}
