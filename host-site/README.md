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

- **Leads list** — `LeadsTable` (desktop, `sm:` and up) / `LeadCard` (mobile)
  — a responsive table/card-list split with progressive column-hiding at
  tablet widths, plus `StagePill` (a dropdown to change a lead's pipeline
  stage inline).
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

Opens on [http://localhost:5173](http://localhost:5173). The embedded widget
won't render anything useful unless `iframe-app` is also running on
`:5174` — use `yarn dev` from the repo root to start both.

## Tests

```bash
yarn workspace host-site test
```
