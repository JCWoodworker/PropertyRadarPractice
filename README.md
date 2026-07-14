# ParcelIQ — an embedded widget POC

A proof-of-concept for what PropertyRadar's next evolution might look like:
instead of only a REST API + webhooks + Zapier, a **composable widget**
that any host CRM can embed directly in its own UI, talking over a
JSON-RPC 2.0 bridge — with a shared component library so the widget always
looks intentional, never like a bolted-on iframe.

- **`host-site`** — "RoofingFlow CRM," a fake CRM for roofing/home-services
  contractors, standing in for a real host application (Salesforce, HubSpot,
  ServiceTitan, ...).
- **`iframe-app`** — "ParcelIQ," the embeddable widget. Looks up a property
  via OpenStreetMap Nominatim, shows a Leaflet map + details, and can flag a
  property as distressed back to the host — live, no page reload.
- **`packages/sdk`** (`@parceliq/embed-sdk`) — the publishable-style SDK a
  host imports to mount the widget, call its methods, and subscribe to its
  events. This is the actual product surface.
- **`packages/ui`** (`@parceliq/ui`) — a shared shadcn/Radix/Tailwind
  component library consumed by both apps, so design tokens and behavior
  never drift between the host and the widget.

Read [`DEMO.md`](./DEMO.md) for the interview walkthrough, and
[`build-process.md`](./build-process.md) for the full build log and every
real decision made along the way (including the ones that turned out wrong
on the first try).

## Architecture

```mermaid
flowchart LR
    subgraph uiPkg ["packages/ui  @parceliq/ui"]
        Primitives["shadcn/radix primitives\n+ shared theme tokens"]
    end

    subgraph hostSite ["host-site (RoofingFlow CRM) :5173"]
        LeadsList["Leads Table"]
        SDKReactWrapper["ParcelIQEmbed"]
        EventLog["Live RPC Event Log"]
    end

    subgraph sdkPkg ["packages/sdk  @parceliq/embed-sdk"]
        WidgetClass["ParcelIQWidget class"]
    end

    subgraph iframeApp ["iframe-app (ParcelIQ widget) :5174"]
        Handlers["RPC handlers"]
        UI["PropertyCard / Map / Flag button"]
    end

    uiPkg --> hostSite
    uiPkg --> iframeApp
    LeadsList --> SDKReactWrapper --> WidgetClass
    WidgetClass -- "postMessage JSON-RPC 2.0" --> Handlers
    Handlers -- "propertyLoaded / propertyFlagged / resize" --> WidgetClass
    WidgetClass --> EventLog
    Handlers --> UI
```

## Quickstart

```bash
yarn install
yarn dev
```

This starts both apps together:

- Host CRM: [http://localhost:5173](http://localhost:5173)
- Widget (standalone preview): [http://localhost:5174](http://localhost:5174)

Click a lead in the CRM to see the widget mount inside a `Sheet`, look up
that lead's address, and log every JSON-RPC message exchanged in the "Live
JSON-RPC Event Log" panel.

## Testing

```bash
yarn test           # run every workspace's tests once
yarn test:watch     # watch mode
yarn test:coverage  # with coverage
```

Vitest + React Testing Library + MSW, no Jest. 71 tests across all four
workspaces (`packages/sdk`, `packages/ui`, `host-site`, `iframe-app`).

## Repo structure

```
.
├── host-site/            # RoofingFlow CRM (the "host")
├── iframe-app/            # ParcelIQ widget (embedded via iframe)
├── packages/
│   ├── sdk/                # @parceliq/embed-sdk — the embed SDK
│   └── ui/                  # @parceliq/ui — shared component library
├── DEMO.md                 # interview walkthrough script
└── build-process.md        # full build log + decision record
```

Each app/package has its own `.cursor/rules/` — in particular
`packages/sdk/.cursor/rules/json-rpc-protocol.mdc`, which encodes the entire
JSON-RPC contract (envelope shape, origin validation, how to add a new
method/event) so an AI agent enforces it automatically on every future
change.

## Known limitations (deliberately not fixed — see `build-process.md`)

- Nominatim (geocoding) and OpenStreetMap tiles are free, key-less services
  meant for light usage — a production version would use a paid
  property-data and mapping API instead.
- Nominatim's search ranking is occasionally imprecise for ambiguous
  addresses (it isn't parcel-level accurate) — acceptable for a demo, not
  for production lead data.
- The widget's origin allowlisting trusts a `parentOrigin` query param set
  by the SDK; a production version would use a signed/config-driven
  allowlist instead of a client-suppliable value.
