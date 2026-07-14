import { Controller, Get, Query } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'

import { LookupPropertyDto } from './dto/lookup-property.dto'
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
}
