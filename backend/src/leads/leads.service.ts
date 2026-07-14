import { Injectable, NotFoundException } from '@nestjs/common'
import type { Lead } from '@prisma/client'

import { PrismaService } from '../prisma/prisma.service'
import type { CreateLeadDto } from './dto/create-lead.dto'
import type { FlagLeadDto } from './dto/flag-lead.dto'
import type { ListLeadsQueryDto } from './dto/list-leads-query.dto'
import type { UpdateLeadStageDto } from './dto/update-lead-stage.dto'

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

    const [rows, total] = await Promise.all([
      this.prisma.lead.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.lead.count(),
    ])

    return {
      data: rows.map((lead) => this.toResponse(lead)),
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    }
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
