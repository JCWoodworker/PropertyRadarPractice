import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import type { Env } from '../config/env.validation'
import { PrismaService } from '../prisma/prisma.service'

export interface PropertyLookupResult {
  address: string
  county: string | null
  state: string | null
  lat: number
  lon: number
  placeType: string
}

interface NominatimResult {
  display_name: string
  lat: string
  lon: string
  type: string
  address?: {
    county?: string
    state?: string
  }
}

@Injectable()
export class PropertiesService {
  private readonly logger = new Logger(PropertiesService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  /**
   * Cache-through Nominatim proxy. Hits `property_lookup_cache` first;
   * on a miss, calls Nominatim server-side with a real User-Agent (impossible
   * from a browser) and stores the result.
   */
  async lookup(address: string): Promise<PropertyLookupResult | null> {
    const queryAddress = address.trim()
    const cached = await this.prisma.propertyLookupCache.findUnique({
      where: { queryAddress },
    })

    if (cached) {
      return {
        address: cached.formattedAddress,
        county: cached.county,
        state: cached.state,
        lat: cached.lat,
        lon: cached.lon,
        placeType: cached.placeType,
      }
    }

    const result = await this.fetchFromNominatim(queryAddress)
    if (!result) {
      return null
    }

    await this.prisma.propertyLookupCache.create({
      data: {
        queryAddress,
        formattedAddress: result.address,
        county: result.county,
        state: result.state,
        lat: result.lat,
        lon: result.lon,
        placeType: result.placeType,
      },
    })

    return result
  }

  private async fetchFromNominatim(
    address: string,
  ): Promise<PropertyLookupResult | null> {
    const userAgent = this.config.get('NOMINATIM_USER_AGENT', { infer: true })
    const url = new URL('https://nominatim.openstreetmap.org/search')
    url.searchParams.set('q', address)
    url.searchParams.set('format', 'json')
    url.searchParams.set('addressdetails', '1')
    url.searchParams.set('limit', '1')

    let response: Response
    try {
      response = await fetch(url.toString(), {
        headers: {
          'User-Agent': userAgent,
          Accept: 'application/json',
        },
      })
    } catch (error) {
      this.logger.error(`Nominatim network error: ${String(error)}`)
      throw new ServiceUnavailableException('Property lookup service unavailable')
    }

    if (!response.ok) {
      this.logger.warn(`Nominatim returned status ${response.status}`)
      throw new ServiceUnavailableException(
        `Property lookup failed with status ${response.status}`,
      )
    }

    const results = (await response.json()) as NominatimResult[]
    if (results.length === 0) {
      return null
    }

    const [top] = results
    return mapNominatimResult(top)
  }

  /**
   * Multi-result autocomplete for the "Add lead" form's address field.
   * Deliberately uncached (unlike `lookup`) — suggestion queries are partial,
   * high-cardinality text as the user types, so a query-address cache would
   * mostly just accumulate rows without ever being hit again.
   */
  async suggest(query: string): Promise<PropertyLookupResult[]> {
    const q = query.trim()
    if (q.length < 3) {
      return []
    }

    const userAgent = this.config.get('NOMINATIM_USER_AGENT', { infer: true })
    const url = new URL('https://nominatim.openstreetmap.org/search')
    url.searchParams.set('q', q)
    url.searchParams.set('format', 'json')
    url.searchParams.set('addressdetails', '1')
    url.searchParams.set('limit', '5')

    let response: Response
    try {
      response = await fetch(url.toString(), {
        headers: {
          'User-Agent': userAgent,
          Accept: 'application/json',
        },
      })
    } catch (error) {
      this.logger.error(`Nominatim network error: ${String(error)}`)
      throw new ServiceUnavailableException('Property lookup service unavailable')
    }

    if (!response.ok) {
      this.logger.warn(`Nominatim returned status ${response.status}`)
      throw new ServiceUnavailableException(
        `Property lookup failed with status ${response.status}`,
      )
    }

    const results = (await response.json()) as NominatimResult[]
    return results.map(mapNominatimResult)
  }
}

function mapNominatimResult(result: NominatimResult): PropertyLookupResult {
  return {
    address: result.display_name,
    county: result.address?.county ?? null,
    state: result.address?.state ?? null,
    lat: Number(result.lat),
    lon: Number(result.lon),
    placeType: result.type,
  }
}
