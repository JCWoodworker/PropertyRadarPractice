import { NotFoundException } from '@nestjs/common'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { LeadsService } from './leads.service'

const mockLead = {
  id: '11111111-1111-1111-1111-111111111111',
  tenantId: null,
  name: 'Dana Whitfield',
  company: 'Whitfield Family Home',
  address: '1600 Pennsylvania Avenue NW, Washington, DC',
  stage: 'Needs Estimate',
  roofAgeYears: 22,
  roofMaterial: 'Asphalt Shingle',
  lastInspection: new Date('2025-02-18'),
  distressFlag: false,
  distressReason: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
}

describe('LeadsService', () => {
  const prisma = {
    lead: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  }

  let service: LeadsService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new LeadsService(prisma as never)
  })

  it('lists a page of leads newest-first with pagination metadata', async () => {
    prisma.lead.findMany.mockResolvedValue([mockLead])
    prisma.lead.count.mockResolvedValue(40)

    const result = await service.list({ page: 2, limit: 25 })

    expect(prisma.lead.findMany).toHaveBeenCalledWith({
      where: {},
      orderBy: { createdAt: 'desc' },
      skip: 25,
      take: 25,
    })
    expect(prisma.lead.count).toHaveBeenCalledWith({ where: {} })
    expect(result).toEqual({
      data: [
        {
          id: mockLead.id,
          name: mockLead.name,
          company: mockLead.company,
          address: mockLead.address,
          stage: mockLead.stage,
          roofAgeYears: mockLead.roofAgeYears,
          roofMaterial: mockLead.roofMaterial,
          lastInspection: '2025-02-18',
          distressFlag: false,
          distressReason: null,
        },
      ],
      page: 2,
      limit: 25,
      total: 40,
      totalPages: 2,
    })
  })

  it('sorts by an arbitrary allowlisted field and direction', async () => {
    prisma.lead.findMany.mockResolvedValue([mockLead])
    prisma.lead.count.mockResolvedValue(1)

    await service.list({ page: 1, limit: 25, sortBy: 'roofAgeYears', sortOrder: 'asc' })

    expect(prisma.lead.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { roofAgeYears: 'asc' } }),
    )
  })

  it('filters by stage', async () => {
    prisma.lead.findMany.mockResolvedValue([mockLead])
    prisma.lead.count.mockResolvedValue(1)

    await service.list({ page: 1, limit: 25, stage: 'Won' })

    expect(prisma.lead.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { stage: 'Won' } }),
    )
    expect(prisma.lead.count).toHaveBeenCalledWith({ where: { stage: 'Won' } })
  })

  it('filters by roof age range', async () => {
    prisma.lead.findMany.mockResolvedValue([mockLead])
    prisma.lead.count.mockResolvedValue(1)

    await service.list({ page: 1, limit: 25, roofAgeMin: 10, roofAgeMax: 20 })

    expect(prisma.lead.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { roofAgeYears: { gte: 10, lte: 20 } } }),
    )
  })

  it('filters by state via an address suffix match', async () => {
    prisma.lead.findMany.mockResolvedValue([mockLead])
    prisma.lead.count.mockResolvedValue(1)

    await service.list({ page: 1, limit: 25, state: 'DC' })

    expect(prisma.lead.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { address: { endsWith: ', DC' } } }),
    )
  })

  it('searches across name, company, and address (case-insensitive)', async () => {
    prisma.lead.findMany.mockResolvedValue([mockLead])
    prisma.lead.count.mockResolvedValue(1)

    await service.list({ page: 1, limit: 25, search: 'whitfield' })

    expect(prisma.lead.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { name: { contains: 'whitfield', mode: 'insensitive' } },
            { company: { contains: 'whitfield', mode: 'insensitive' } },
            { address: { contains: 'whitfield', mode: 'insensitive' } },
          ],
        },
      }),
    )
  })

  it('creates a lead and returns the created entity', async () => {
    prisma.lead.create.mockResolvedValue(mockLead)

    const result = await service.create({
      name: mockLead.name,
      company: mockLead.company,
      address: mockLead.address,
      stage: 'Needs Estimate',
      roofAgeYears: 22,
      roofMaterial: 'Asphalt Shingle',
      lastInspection: '2025-02-18',
    })

    expect(prisma.lead.create).toHaveBeenCalled()
    expect(result.id).toBe(mockLead.id)
    expect(result.name).toBe(mockLead.name)
  })

  it('throws NotFoundException when deleting a missing lead', async () => {
    prisma.lead.delete.mockRejectedValue(new Error('Record to delete does not exist'))

    await expect(service.remove(mockLead.id)).rejects.toBeInstanceOf(NotFoundException)
  })

  it('flags by address and throws when no row matches', async () => {
    prisma.lead.updateMany.mockResolvedValue({ count: 0 })

    await expect(
      service.flagByAddress({
        address: 'missing',
        reason: 'damage',
      }),
    ).rejects.toBeInstanceOf(NotFoundException)
  })

  it('flags matching address and returns the updated leads', async () => {
    const flagged = {
      ...mockLead,
      distressFlag: true,
      distressReason: 'Visible roof damage',
    }
    prisma.lead.updateMany.mockResolvedValue({ count: 1 })
    prisma.lead.findMany.mockResolvedValue([flagged])

    const result = await service.flagByAddress({
      address: mockLead.address,
      reason: 'Visible roof damage',
    })

    expect(prisma.lead.updateMany).toHaveBeenCalledWith({
      where: { address: mockLead.address },
      data: {
        distressFlag: true,
        distressReason: 'Visible roof damage',
      },
    })
    expect(result).toHaveLength(1)
    expect(result[0]?.distressFlag).toBe(true)
  })
})
