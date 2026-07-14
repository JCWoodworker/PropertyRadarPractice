import { Module } from '@nestjs/common'

import { PropertiesController } from './properties.controller'
import { PropertiesService } from './properties.service'

/**
 * ParcelIQ widget domain — logically the embed vendor's backend.
 * Owns property lookup cache + Nominatim proxy (`/properties`) only.
 * Must not import LeadsModule or touch the `Lead` table. iframe-app is
 * the intended client. Co-located in one Nest process for POC simplicity;
 * treat this module as if it were a separate service.
 */
@Module({
  controllers: [PropertiesController],
  providers: [PropertiesService],
})
export class PropertiesModule {}
