# iframe-app — ParcelIQ Widget

The embeddable widget itself: looks up a property via OpenStreetMap
Nominatim, renders a Leaflet map + property details, and talks to whatever
host page embeds it over a JSON-RPC 2.0 bridge (see `@parceliq/embed-sdk`).

See the [repo root README](../README.md) for the full architecture and how
to run everything together, and [`ARCHITECTURE.md`](../ARCHITECTURE.md) for
a deep technical walkthrough of everything in this app (the RPC bridge's
widget-side implementation, the offline-resilient query cache, the
watchlist feature, and the circular iframe-resize bug that got found and
fixed).

## What's in here

- **`lib/rpc-bridge.ts` + `hooks/use-rpc-bridge.ts`** — the widget's half of
  the JSON-RPC bridge: origin validation, request dispatch, and the
  `notify()` function used to send `ready`/`propertyLoaded`/`resize`/
  `propertyFlagged` back to the host.
- **`Lookup` tab** — `PropertyCard` + `PropertyMap` (Leaflet), with "Save to
  watchlist" and "Flag as Distressed" actions.
- **`Watchlist` tab** — a localStorage-backed saved-properties list
  (`WatchlistPanel`), demonstrating the same mutate-then-invalidate hook
  pattern used on the host side, but inside the widget itself.
- **Offline resilience** — the TanStack Query cache is persisted to
  `localStorage`; a failed lookup falls back to the last cached result for
  that address with an `OfflineBanner` instead of a bare error.

## Run just this app

```bash
yarn workspace iframe-app dev
```

Opens on [http://localhost:5174](http://localhost:5174) in a standalone
preview mode (shows a default address, with a banner explaining it's
normally loaded inside a host CRM).

## Tests

```bash
yarn workspace iframe-app test
```
