# backend — NestJS API

ParcelIQ / RoofingFlow persistence layer. One Docker process, **two siloed
domains**:

| Module | Role | Routes | Client |
|--------|------|--------|--------|
| `LeadsModule` | CRM backend | `/leads*` (paginated) | `host-site` |
| `PropertiesModule` | Widget property lookup | `/properties` | `iframe-app` |

They share Postgres + Nest infra only — not business logic or tables. See
`.cursor/rules/domain-siloing.mdc` and root `ARCHITECTURE.md` § Backend.

**Seed:** `prisma db seed` idempotently tops the `leads` table up to **300**
rows (7 featured addresses + synthetics). Compose runs seed on backend start.

**List:** `GET /leads?page=1&limit=25` →
`{ data, page, limit, total, totalPages }` (default page size 25, max 100).

## Run

From the repo root (preferred):

```bash
yarn dev          # docker compose up postgres+backend, then Vite apps
yarn dev:logs     # follow Nest logs
yarn dev:down     # stop Compose
```

API: [http://localhost:3000](http://localhost:3000) · Swagger:
[http://localhost:3000/api/docs](http://localhost:3000/api/docs)

Copy `backend/.env.example` → `backend/.env` for local (non-Docker) runs.

## Tests

```bash
yarn workspace backend test       # unit (mocked Prisma)
yarn workspace backend test:e2e   # supertest + parceliq_test DB
```

Vitest + `unplugin-swc` only — no Jest.
