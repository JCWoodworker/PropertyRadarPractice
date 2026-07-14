import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'

import { CreateLeadDto } from './dto/create-lead.dto'
import { FlagLeadDto } from './dto/flag-lead.dto'
import { ListLeadsQueryDto } from './dto/list-leads-query.dto'
import { UpdateLeadStageDto } from './dto/update-lead-stage.dto'
import { LeadsService } from './leads.service'

@ApiTags('leads')
@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Get()
  @ApiOperation({ summary: 'List leads paginated (newest first)' })
  list(@Query() query: ListLeadsQueryDto) {
    return this.leadsService.list(query)
  }

  @Post()
  @ApiOperation({ summary: 'Create a lead; returns the created lead' })
  create(@Body() dto: CreateLeadDto) {
    return this.leadsService.create(dto)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a lead by id' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.leadsService.remove(id)
  }

  @Patch(':id/stage')
  @ApiOperation({ summary: 'Update a lead pipeline stage' })
  updateStage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLeadStageDto,
  ) {
    return this.leadsService.updateStage(id, dto)
  }

  @Post('flag')
  @ApiOperation({
    summary: 'Flag a lead as distressed by address (widget → host contract)',
  })
  flag(@Body() dto: FlagLeadDto) {
    return this.leadsService.flagByAddress(dto)
  }
}
