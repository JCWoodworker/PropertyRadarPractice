# host-site — RoofingFlow CRM

A small fake CRM for roofing/home-services contractors. Plays the role of a
third-party host application (think Salesforce, HubSpot, ServiceTitan) that
embeds the ParcelIQ property-insights widget (`iframe-app`) via
`@parceliq/embed-sdk`.

See the [repo root README](../README.md) for the full architecture and how
to run everything together, and [`ARCHITECTURE.md`](../ARCHITECTURE.md) for
a deep technical walkthrough of everything in this app (the leads data
layer, `ParcelIQEmbed`, the responsive table/card split, the event log
drawer, and the bugs that got found and fixed along the way).

## What's in here

- **Leads list** — paginated (~300 seeded leads, 25/page) via TanStack Query
  keys `['leads', { page, limit }]`, with optimistic mutations.
  `LeadsTable` (desktop) / `LeadCard` (mobile) plus `LeadsPagination` and
  `StagePill`.
- **`ParcelIQEmbed`** — the component that actually uses
  `@parceliq/embed-sdk` to mount the widget inside `LeadDetailSheet`.
- **Live JSON-RPC Event Log** — a bottom-docked, collapsible drawer
  (`EventLogDrawer`/`RpcEventLog`) showing every real message exchanged with
  the embedded widget.
- **`AddLeadDialog`** / delete confirmation (`ConfirmDialog` from
  `@parceliq/ui`) for the CRUD parts of the leads list.

## Run just this app

```bash
yarn workspace host-site dev
```

Opens on [http://localhost:5173](http://localhost:5173). Needs the Nest
backend on `:3000` (Postgres + `backend` via Docker) and `iframe-app` on
`:5174` for a full demo — use `yarn dev` from the repo root to start
everything.

## Tests

```bash
yarn workspace host-site test
```
