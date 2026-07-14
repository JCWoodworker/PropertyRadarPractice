# iframe-app — ParcelIQ Widget

The embeddable widget itself: looks up a property via OpenStreetMap
Nominatim, renders a Leaflet map + property details, and talks to whatever
host page embeds it over a JSON-RPC 2.0 bridge (see `@parceliq/embed-sdk`).

See the [repo root README](../README.md) for the full architecture and how
to run everything together.

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
