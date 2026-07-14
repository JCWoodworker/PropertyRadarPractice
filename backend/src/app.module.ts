import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import { APP_GUARD } from '@nestjs/core'

import { validateEnv } from './config/env.validation'
import { HealthModule } from './health/health.module'
import { LeadsModule } from './leads/leads.module'
import { PrismaModule } from './prisma/prisma.module'
import { PropertiesModule } from './properties/properties.module'

/**
 * Single Nest process hosting two deliberately siloed domains:
 * - LeadsModule  → RoofingFlow CRM backend (host-site client)
 * - PropertiesModule → ParcelIQ widget backend (iframe-app client)
 * They share infra (config, Prisma connection, throttling, health) only —
 * not business logic or tables. Treat them as if they were two services.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 120,
      },
    ]),
    PrismaModule,
    LeadsModule,
    PropertiesModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
