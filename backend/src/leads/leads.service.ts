import { Injectable, NotFoundException } from '@nestjs/common'
import type { Lead, Prisma } from '@prisma/client'

import { PrismaService } from '../prisma/prisma.service'
import type { CreateLeadDto } from './dto/create-lead.dto'
import type { FlagLeadDto } from './dto/flag-lead.dto'
import type { LeadSortField, ListLeadsQueryDto } from './dto/list-leads-query.dto'
import type { UpdateLeadStageDto } from './dto/update-lead-stage.dto'

/** Allowlist mapping query `sortBy` values to real Prisma orderBy keys. */
const SORT_FIELD_MAP: Record<LeadSortField, keyof Prisma.LeadOrderByWithRelationInput> = {
  name: 'name',
  company: 'company',
  address: 'address',
  stage: 'stage',
  roofAgeYears: 'roofAgeYears',
  distressFlag: 'distressFlag',
  createdAt: 'createdAt',
}

/** Wire format matching the host CRM's existing Lead interface. */
export interface LeadResponse {
  id: string
  name: string
  company: string
  address: string
  stage: string
  roofAgeYears: number
  roofMaterial: string
  lastInspection: string
  distressFlag: boolean
  distressReason: string | null
}

export interface PaginatedLeadsResponse {
  data: LeadResponse[]
  page: number
  limit: number
  total: number
  totalPages: number
}

@Injectable()
export class LeadsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListLeadsQueryDto): Promise<PaginatedLeadsResponse> {
    const page = query.page
    const limit = query.limit
    const skip = (page - 1) * limit
    const where = this.buildWhere(query)
    const sortField = SORT_FIELD_MAP[query.sortBy ?? 'createdAt']
    const sortOrder = query.sortOrder ?? 'desc'
    const orderBy = { [sortField]: sortOrder } as Prisma.LeadOrderByWithRelationInput

    const [rows, total] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.lead.count({ where }),
    ])

    return {
      data: rows.map((lead) => this.toResponse(lead)),
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    }
  }

  /**
   * `state` isn't a real column — it's derived from the trailing ", ST" in
   * `address` (see `getStateFromAddress` on the frontend), so it's filtered
   * the same way here via a suffix match rather than a dedicated field.
   */
  private buildWhere(query: ListLeadsQueryDto): Prisma.LeadWhereInput {
    const where: Prisma.LeadWhereInput = {}

    if (query.stage) {
      where.stage = query.stage
    }

    if (query.roofAgeMin !== undefined || query.roofAgeMax !== undefined) {
      where.roofAgeYears = {
        ...(query.roofAgeMin !== undefined ? { gte: query.roofAgeMin } : {}),
        ...(query.roofAgeMax !== undefined ? { lte: query.roofAgeMax } : {}),
      }
    }

    if (query.state) {
      where.address = { endsWith: `, ${query.state}` }
    }

    if (query.search) {
      const search = query.search.trim()
      if (search.length > 0) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { company: { contains: search, mode: 'insensitive' } },
          { address: { contains: search, mode: 'insensitive' } },
        ]
      }
    }

    return where
  }

  async create(dto: CreateLeadDto): Promise<LeadResponse> {
    const lead = await this.prisma.lead.create({
      data: {
        name: dto.name,
        company: dto.company,
        address: dto.address,
        stage: dto.stage,
        roofAgeYears: dto.roofAgeYears,
        roofMaterial: dto.roofMaterial,
        lastInspection: new Date(dto.lastInspection),
      },
    })
    return this.toResponse(lead)
  }

  async remove(id: string): Promise<{ id: string }> {
    try {
      await this.prisma.lead.delete({ where: { id } })
    } catch {
      throw new NotFoundException(`Lead ${id} not found`)
    }
    return { id }
  }

  async updateStage(id: string, dto: UpdateLeadStageDto): Promise<LeadResponse> {
    try {
      const lead = await this.prisma.lead.update({
        where: { id },
        data: { stage: dto.stage },
      })
      return this.toResponse(lead)
    } catch {
      throw new NotFoundException(`Lead ${id} not found`)
    }
  }

  /**
   * Flag by address (not id) — deliberate: the ParcelIQ widget only ever
   * knows an address, never the host CRM's internal lead id.
   */
  async flagByAddress(dto: FlagLeadDto): Promise<LeadResponse[]> {
    const result = await this.prisma.lead.updateMany({
      where: { address: dto.address },
      data: {
        distressFlag: true,
        distressReason: dto.reason,
      },
    })

    if (result.count === 0) {
      throw new NotFoundException(`No lead found with address "${dto.address}"`)
    }

    const matches = await this.prisma.lead.findMany({
      where: { address: dto.address },
      orderBy: { createdAt: 'desc' },
    })
    return matches.map((lead) => this.toResponse(lead))
  }

  private toResponse(lead: Lead): LeadResponse {
    return {
      id: lead.id,
      name: lead.name,
      company: lead.company,
      address: lead.address,
      stage: lead.stage,
      roofAgeYears: lead.roofAgeYears,
      roofMaterial: lead.roofMaterial,
      lastInspection: lead.lastInspection.toISOString().slice(0, 10),
      distressFlag: lead.distressFlag,
      distressReason: lead.distressReason,
    }
  }
}
