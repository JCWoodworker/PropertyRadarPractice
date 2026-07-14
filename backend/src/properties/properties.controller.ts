import { Controller, Get, Query } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'

import { LookupPropertyDto } from './dto/lookup-property.dto'
import { SuggestPropertyDto } from './dto/suggest-property.dto'
import { PropertiesService } from './properties.service'

@ApiTags('properties')
@Controller('properties')
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @Get()
  @ApiOperation({
    summary: 'Lookup a property by address (cached Nominatim proxy)',
  })
  lookup(@Query() query: LookupPropertyDto) {
    return this.propertiesService.lookup(query.address)
  }

  @Get('suggest')
  @ApiOperation({
    summary: 'Get up to 5 address autocomplete suggestions for partial text (uncached Nominatim proxy)',
  })
  suggest(@Query() query: SuggestPropertyDto) {
    return this.propertiesService.suggest(query.q)
  }
}
