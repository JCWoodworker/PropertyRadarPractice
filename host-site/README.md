# host-site — RoofingFlow CRM

A small fake CRM for roofing/home-services contractors. Plays the role of a
third-party host application (think Salesforce, HubSpot, ServiceTitan) that
embeds the ParcelIQ property-insights widget (`iframe-app`) via
`@parceliq/embed-sdk`.

See the [repo root README](../README.md) for the full architecture and how
to run everything together.

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
