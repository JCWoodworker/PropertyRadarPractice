import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const TARGET_LEAD_COUNT = 300

const STAGES = ['Needs Estimate', 'Scheduled', 'Quoted', 'Won', 'Lost'] as const
const MATERIALS = [
  'Asphalt Shingle',
  'Membrane (TPO)',
  'Metal',
  'Tile',
  'Slate',
  'Wood Shake',
] as const

const FIRST_NAMES = [
  'Alex', 'Jordan', 'Casey', 'Riley', 'Morgan', 'Quinn', 'Avery', 'Cameron',
  'Drew', 'Elliot', 'Finley', 'Harper', 'Jamie', 'Kai', 'Logan', 'Noah',
  'Parker', 'Reese', 'Sage', 'Taylor', 'Skyler', 'Blair', 'Dakota', 'Emery',
  'Hayden', 'Jesse', 'Lane', 'Micah', 'Peyton', 'River',
]

const LAST_NAMES = [
  'Nguyen', 'Patel', 'Kim', 'Garcia', 'Brooks', 'Chen', 'Singh', 'Walker',
  'Torres', 'Bennett', 'Hughes', 'Flores', 'Coleman', 'Reed', 'Price',
  'Sanders', 'Ross', 'Powell', 'Jenkins', 'Perry', 'Butler', 'Barnes',
  'Henderson', 'Coleman', 'Simmons', 'Foster', 'Gonzales', 'Bryant', 'Alexander',
  'Russell',
]

const CITIES: Array<{ city: string; state: string; street: string }> = [
  { city: 'Seattle', state: 'WA', street: 'Pine St' },
  { city: 'Denver', state: 'CO', street: 'Colfax Ave' },
  { city: 'Portland', state: 'OR', street: 'Burnside St' },
  { city: 'Phoenix', state: 'AZ', street: 'Central Ave' },
  { city: 'Miami', state: 'FL', street: 'Ocean Dr' },
  { city: 'Boston', state: 'MA', street: 'Boylston St' },
  { city: 'Nashville', state: 'TN', street: 'Broadway' },
  { city: 'Minneapolis', state: 'MN', street: 'Nicollet Ave' },
  { city: 'Atlanta', state: 'GA', street: 'Peachtree St' },
  { city: 'Dallas', state: 'TX', street: 'Main St' },
  { city: 'San Diego', state: 'CA', street: 'Harbor Dr' },
  { city: 'Philadelphia', state: 'PA', street: 'Market St' },
  { city: 'Detroit', state: 'MI', street: 'Woodward Ave' },
  { city: 'Charlotte', state: 'NC', street: 'Tryon St' },
  { city: 'Salt Lake City', state: 'UT', street: 'State St' },
]

/**
 * Same seven roofing leads historically used by host-site. Seeded first when
 * the table is empty; extra synthetic leads then top up to TARGET_LEAD_COUNT.
 */
const FEATURED_LEADS = [
  {
    name: 'Dana Whitfield',
    company: 'Whitfield Family Home',
    address: '1600 Pennsylvania Avenue NW, Washington, DC',
    stage: 'Needs Estimate',
    roofAgeYears: 22,
    roofMaterial: 'Asphalt Shingle',
    lastInspection: new Date('2025-02-18'),
    distressFlag: false,
    distressReason: null,
  },
  {
    name: 'Marcus Ortiz',
    company: 'Ortiz Rental Properties',
    address: '350 Fifth Avenue, New York, NY',
    stage: 'Scheduled',
    roofAgeYears: 8,
    roofMaterial: 'Membrane (TPO)',
    lastInspection: new Date('2025-11-03'),
    distressFlag: false,
    distressReason: null,
  },
  {
    name: 'Priya Chandra',
    company: 'Chandra Holdings LLC',
    address: '233 S Wacker Dr, Chicago, IL',
    stage: 'Quoted',
    roofAgeYears: 15,
    roofMaterial: 'Metal',
    lastInspection: new Date('2025-08-22'),
    distressFlag: false,
    distressReason: null,
  },
  {
    name: 'Ben Ferreira',
    company: 'Ferreira Residence',
    address: '1 Infinite Loop, Cupertino, CA',
    stage: 'Won',
    roofAgeYears: 4,
    roofMaterial: 'Tile',
    lastInspection: new Date('2026-01-10'),
    distressFlag: false,
    distressReason: null,
  },
  {
    name: 'Sam Okafor',
    company: 'Okafor & Sons',
    address: '600 Congress Ave, Austin, TX',
    stage: 'Needs Estimate',
    roofAgeYears: 27,
    roofMaterial: 'Asphalt Shingle',
    lastInspection: new Date('2024-09-30'),
    distressFlag: false,
    distressReason: null,
  },
  {
    name: 'Lena Kowalski',
    company: 'Kowalski Duplex',
    address: '1 World Trade Center, New York, NY',
    stage: 'Lost',
    roofAgeYears: 12,
    roofMaterial: 'Slate',
    lastInspection: new Date('2025-05-06'),
    distressFlag: false,
    distressReason: null,
  },
  {
    name: 'Theo Marsh',
    company: 'Marsh Property Group',
    address: '4059 Mt Lee Dr, Los Angeles, CA',
    stage: 'Scheduled',
    roofAgeYears: 19,
    roofMaterial: 'Wood Shake',
    lastInspection: new Date('2025-06-19'),
    distressFlag: false,
    distressReason: null,
  },
]

function buildSyntheticLead(index: number) {
  const first = FIRST_NAMES[index % FIRST_NAMES.length]!
  const last = LAST_NAMES[Math.floor(index / FIRST_NAMES.length) % LAST_NAMES.length]!
  const place = CITIES[index % CITIES.length]!
  const streetNum = 100 + (index % 8900)
  const year = 2024 + (index % 3)
  const month = String((index % 12) + 1).padStart(2, '0')
  const day = String((index % 28) + 1).padStart(2, '0')

  return {
    name: `${first} ${last}`,
    company: `${last} ${index % 3 === 0 ? 'Properties' : index % 3 === 1 ? 'Residence' : 'Holdings'}`,
    address: `${streetNum} ${place.street}, ${place.city}, ${place.state}`,
    stage: STAGES[index % STAGES.length]!,
    roofAgeYears: 3 + (index % 35),
    roofMaterial: MATERIALS[index % MATERIALS.length]!,
    lastInspection: new Date(`${year}-${month}-${day}`),
    distressFlag: false,
    distressReason: null,
  }
}

async function main() {
  const existing = await prisma.lead.count()

  if (existing >= TARGET_LEAD_COUNT) {
    console.log(`Seed skipped: leads table already has ${existing} row(s) (>= ${TARGET_LEAD_COUNT}).`)
    return
  }

  if (existing === 0) {
    await prisma.lead.createMany({ data: FEATURED_LEADS })
    console.log(`Seeded ${FEATURED_LEADS.length} featured leads.`)
  }

  const afterFeatured = await prisma.lead.count()
  const remaining = TARGET_LEAD_COUNT - afterFeatured
  if (remaining <= 0) {
    console.log(`Leads table at ${afterFeatured} row(s); nothing more to insert.`)
    return
  }

  const batch = Array.from({ length: remaining }, (_, i) => buildSyntheticLead(afterFeatured + i))
  await prisma.lead.createMany({ data: batch })
  console.log(`Topped up ${remaining} lead(s). Total now ${TARGET_LEAD_COUNT}.`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
