import { INestApplication, ValidationPipe } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'

import { AppModule } from '../src/app.module'
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter'
import { PrismaService } from '../src/prisma/prisma.service'

/**
 * E2E against the real `parceliq_test` Postgres database. Requires the
 * compose postgres service (or a local Postgres) with that DB already created.
 */
describe('Leads + Properties (e2e)', () => {
  let app: INestApplication
  let prisma: PrismaService

  beforeAll(async () => {
    process.env.DATABASE_URL =
      process.env.DATABASE_URL_TEST ??
      'postgresql://parceliq:parceliq@localhost:5432/parceliq_test?schema=public'
    process.env.PORT = '3001'
    process.env.CORS_ORIGINS = 'http://localhost:5173,http://localhost:5174'
    process.env.NOMINATIM_USER_AGENT = 'ParcelIQ-POC/1.0 (e2e-test)'
    process.env.NODE_ENV = 'test'

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleRef.createNestApplication()
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    )
    app.useGlobalFilters(new HttpExceptionFilter())
    await app.init()

    prisma = app.get(PrismaService)
    const { execSync } = await import('node:child_process')
    execSync('npx prisma migrate deploy', {
      cwd: process.cwd(),
      env: process.env,
      stdio: 'inherit',
    })
  }, 90_000)

  beforeEach(async () => {
    await prisma.propertyLookupCache.deleteMany()
    await prisma.lead.deleteMany()
  })

  afterAll(async () => {
    await app?.close()
  })

  it('GET /health returns ok when the DB is reachable', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200)
    expect(res.body).toEqual({ status: 'ok' })
  })

  it('supports paginated list, CRUD, stage update, and address-keyed flagging', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/leads')
      .send({
        name: 'Test Lead',
        company: 'Test Co',
        address: '1 Test Way',
        stage: 'Needs Estimate',
        roofAgeYears: 10,
        roofMaterial: 'Metal',
        lastInspection: '2026-01-01',
      })
      .expect(201)

    expect(createRes.body).toMatchObject({ name: 'Test Lead', address: '1 Test Way' })
    const leadId = createRes.body.id as string

    const page = await request(app.getHttpServer())
      .get('/leads')
      .query({ page: 1, limit: 25 })
      .expect(200)

    expect(page.body).toMatchObject({
      page: 1,
      limit: 25,
      total: 1,
      totalPages: 1,
    })
    expect(page.body.data).toHaveLength(1)

    const staged = await request(app.getHttpServer())
      .patch(`/leads/${leadId}/stage`)
      .send({ stage: 'Won' })
      .expect(200)

    expect(staged.body).toMatchObject({ id: leadId, stage: 'Won' })

    const flagged = await request(app.getHttpServer())
      .post('/leads/flag')
      .send({ address: '1 Test Way', reason: 'Visible roof damage' })
      .expect(201)

    expect(flagged.body[0]).toMatchObject({
      stage: 'Won',
      distressFlag: true,
      distressReason: 'Visible roof damage',
    })

    await request(app.getHttpServer())
      .delete(`/leads/${leadId}`)
      .expect(200)
      .expect({ id: leadId })

    const empty = await request(app.getHttpServer()).get('/leads').expect(200)
    expect(empty.body).toMatchObject({ data: [], total: 0, totalPages: 0 })
  })

  it('rejects invalid lead payloads with 400', async () => {
    await request(app.getHttpServer())
      .post('/leads')
      .send({ name: 'incomplete' })
      .expect(400)
  })
})
