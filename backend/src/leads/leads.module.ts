import { Module } from '@nestjs/common'

import { LeadsController } from './leads.controller'
import { LeadsService } from './leads.service'

/**
 * RoofingFlow CRM domain — logically the host CRM's backend.
 * Owns the `Lead` table and `/leads*` routes only. Must not import
 * PropertiesModule or touch `PropertyLookupCache` (those belong to the
 * ParcelIQ widget side). Host-site is the intended client; the widget
 * never calls these endpoints (distress flagging goes widget → RPC → host).
 */
@Module({
  controllers: [LeadsController],
  providers: [LeadsService],
})
export class LeadsModule {}
