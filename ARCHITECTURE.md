# Architecture — How This Actually Works

This is the file to read (and re-read) before the interview. `build-process.md`
tells the story of *how* this got built; this file explains *what it does and
why*, in enough depth that you can answer follow-up questions about any part
of it without hesitating. It's organized bottom-up: the SDK first (the actual
product), then the UI library, then each app, then how they all fit together.

## The one-paragraph mental model

There are two websites that don't know anything about each other's internals:
a fake CRM (`host-site`) and a fake embeddable widget (`iframe-app`). The CRM
loads the widget inside an `<iframe>`. The two documents can only talk to each
other through the browser's `postMessage` API — that's the *only* channel
that crosses an iframe boundary. `packages/sdk` defines a strict JSON-RPC 2.0
protocol on top of `postMessage` and wraps the host's side of it in a class
(`ParcelIQWidget`) so the CRM never touches `postMessage` directly. Both apps
also import `packages/ui`, a shared component library, so they stay visually
consistent even though they're two separate deployables. Persistence and
geocoding go through a NestJS + Postgres backend that co-locates two siloed
domain modules (Leads for the CRM, Properties for the widget) in one process
for the POC — treated as separate backends that share infra only. That's the
whole system.

## Repo layout

```
.
├── packages/
│   ├── sdk/     @parceliq/embed-sdk — the protocol + the ParcelIQWidget class
│   └── ui/      @parceliq/ui        — shared shadcn/Radix/Tailwind components
├── backend/      NestJS + Prisma     — LeadsModule (CRM) + PropertiesModule (widget)
├── host-site/    RoofingFlow CRM     — the "host" app (:5173)
├── iframe-app/   ParcelIQ widget     — the embedded app (:5174)
└── docker-compose.yml                — Postgres + backend (:3000)
```

`host-site` and `iframe-app` both depend on `packages/ui`. Only `host-site`
depends on `packages/sdk` at runtime — `iframe-app` only imports *types* from
it (see "Why `iframe-app` doesn't really depend on the SDK" below). This is a
Yarn workspaces monorepo; packages share one `node_modules` at the repo root,
and Vite consumes the two `packages/*` directly as TypeScript source (no build
step). Postgres and the Nest backend run in Docker; the two Vite apps stay
native for HMR.

---

## 1. The SDK — `packages/sdk` (`@parceliq/embed-sdk`)

This package is the actual product. Everything else in this repo exists to
demonstrate it.

### JSON-RPC 2.0, the 30-second version

Every message is a plain JSON object with `"jsonrpc": "2.0"`. There are two
shapes:

- **Request** — has both `method` and `id`. The receiver *must* eventually
  send back a **response** with that same `id` (either a `result` or an
  `error`, never both). Requests are how the host *calls* the widget:
  `loadProperty`, `setTheme`, `ping`.
- **Notification** — has `method` but *no* `id`. Fire-and-forget: the
  receiver must not respond. Notifications are how the widget tells the host
  something happened, unprompted: `ready`, `propertyLoaded`, `resize`,
  `propertyFlagged`, `error`.

That distinction (does it have an `id`?) is the entire protocol. Everything
else in the SDK exists to encode, validate, and route these two shapes
correctly.

### `types.ts` — the contract, as TypeScript types

```ts
export interface RpcMethodMap {
  ping: { params: undefined; result: { pong: true; timestamp: number } }
  loadProperty: { params: { address: string }; result: PropertyResult }
  setTheme: { params: ThemeOptions; result: { ok: true } }
}

export interface RpcEventMap {
  ready: undefined
  propertyLoaded: PropertyResult
  error: { message: string; code?: string }
  resize: { height: number }
  propertyFlagged: { address: string; reason: string }
}
```

`RpcMethodMap` is every **request** the host can send, with its params and
result type. `RpcEventMap` is every **notification** the widget can send.
This is the single source of truth — if you want to add a new capability to
the bridge, you add an entry here *first*, and the rest of the code derives
its types from these two maps (`keyof RpcMethodMap`, indexed access like
`RpcMethodMap['loadProperty']['result']`, etc.), so a typo or a missing case
is a compile error, not a runtime surprise. This exact workflow is codified
in `packages/sdk/.cursor/rules/json-rpc-protocol.mdc`, with a worked example.

`types.ts` also has three type guards — `isJsonRpcRequest`,
`isJsonRpcResponse`, `isJsonRpcNotification` — that narrow an `unknown`
`event.data` down to one of the three shapes above by checking for the
presence/absence of `id`/`method`/`result`/`error`. Both sides of the bridge
use these instead of hand-rolled duck-typing.

### `rpc.ts` — small transport-layer helpers

- `createRequestId()` — a monotonic-ish unique id (`parceliq-<timestamp>-<counter>`)
  used to correlate a request with its eventual response.
- `buildNotification(method, params)` — builds a valid notification envelope.
- `TypedEmitter<EventMap>` — a tiny, dependency-free event emitter
  (`.on(event, handler)` returns an unsubscribe function, `.emit(event,
  payload)`, `.clear()`). Both `ParcelIQWidget` (host side) and the widget's
  own bridge use one of these to expose `.on('propertyFlagged', ...)`-style
  subscriptions without pulling in a library.

### `widget.ts` — the `ParcelIQWidget` class

This is the public SDK surface — the thing `host-site` actually imports and
uses. Conceptually it's the same shape as Stripe Elements or Intercom's embed
SDKs: you construct one, call `.mount()`, and get back a promise-based API.

```ts
const widget = new ParcelIQWidget({
  container: someDiv,
  src: 'http://localhost:5174',
  theme: { mode: 'dark' },
  onMessage: (direction, message) => console.log(direction, message),
})
widget.mount()
widget.on('propertyFlagged', ({ address, reason }) => { /* ... */ })
await widget.loadProperty('123 Main St')
```

Walking through what actually happens inside:

1. **`mount()`** creates a real `<iframe>`, appends the host's own origin to
   the `src` as a `?parentOrigin=...` query parameter (this is how the widget
   later knows which origin to trust — see the handshake section below), sets
   a `sandbox` attribute (`allow-scripts allow-same-origin allow-popups
   allow-forms` — deliberately *not* `allow-top-navigation` or anything that
   would let the widget navigate the host page), and starts listening for
   `message` events on `window`.
2. **The ready handshake.** The widget won't be ready to receive calls the
   instant the iframe element exists — it needs to load, run React, and wire
   up its own listener. So every public method (`loadProperty`, `setTheme`,
   `ping`) goes through a private `call()` method that checks an internal
   `ready` flag: if the widget hasn't sent its `ready` notification yet, the
   call is wrapped in a closure and pushed onto a `callQueue` array instead
   of being sent immediately. When the `ready` notification arrives, a
   `flushQueue()` runs every queued closure in order. This means you can call
   `widget.loadProperty(...)` immediately after `mount()` without an
   artificial `setTimeout` or manual "wait for ready" dance — it Just Works,
   and there's a 10-second timeout that logs a warning if `ready` never
   shows up (e.g. the widget URL is wrong).
3. **`call(method, params)`** (private, used by the public methods) generates
   a request id, stores a `{resolve, reject}` pair in a `pending` `Map` keyed
   by that id, starts a 10-second timeout that rejects if nothing comes back,
   and posts the request to the iframe's `contentWindow` — scoped to
   `allowedOrigin`, never `'*'`.
4. **`handleMessage(event)`** is the `window` listener. First it checks
   `event.origin === this.allowedOrigin` *and* `event.source ===
   iframe.contentWindow` — both must match, or the message is silently
   ignored. (`allowedOrigin` is derived from the `src` you passed in, e.g.
   `http://localhost:5174`.) Then: if the message is a **response**
   (`isJsonRpcResponse`), it looks up the matching pending call by `id`,
   removes it from the map, and resolves/rejects the promise. If it's a
   **notification** (`isJsonRpcNotification`), it emits it on the internal
   `TypedEmitter` — which is what fires any `.on('propertyLoaded', ...)`
   handlers you registered.
5. **`destroy()`** removes the `window` listener, rejects every still-pending
   call with an error, clears the emitter, and removes the iframe from the
   DOM. `host-site`'s `ParcelIQEmbed` calls this from a `useEffect` cleanup
   function every time a lead's detail sheet closes or a different lead is
   selected.
6. **`onMessage` (debug hook).** The constructor accepts an optional
   `onMessage: (direction, message) => void` called for *every* envelope sent
   or received, before any other processing. `host-site`'s live event log
   panel is built entirely from this hook — it's not a simulated log, it's
   literally the same data the SDK uses internally to route messages.

### The `parentOrigin` handshake — why origin validation is actually meaningful

A naive version of this SDK might hardcode "trust anything" or use `'*'` as
the postMessage target origin, which defeats the entire point of origin
checking. Instead:

- The **host** already knows the widget's origin (it's baked into the `src`
  URL you configured), so `ParcelIQWidget` derives `allowedOrigin` from that
  directly.
- The **widget** doesn't inherently know who's embedding it — any page on
  the internet could put it in an iframe. So `mount()` appends
  `?parentOrigin=<the host's own origin>` to the iframe's `src`, and the
  widget reads that back out of `window.location.search` via
  `getExpectedParentOrigin()` in `iframe-app/src/lib/rpc-bridge.ts`. Every
  incoming `message` event is checked against that value (and that
  `event.source === window.parent`) before anything else happens — see
  `isTrustedParentMessage`.

Both sides end up validating the other's origin independently, using
information they each already legitimately had — no shared secret, no extra
round trip.

### Why `iframe-app` doesn't really depend on the SDK

`packages/sdk` is a **devDependency** of `iframe-app`, not a runtime one.
`iframe-app` only does `import type { PropertyResult, RpcMethodMap, ... }
from '@parceliq/embed-sdk'` — type-only imports that TypeScript/esbuild strip
out completely at build time (`verbatimModuleSyntax` in `tsconfig.json`
enforces that `import type` is used correctly). This is deliberate: the
widget shouldn't ship the host-side `ParcelIQWidget` class in its own bundle,
since it never needs it — it needs the *shapes*, not the *class*. The
widget's own half of the bridge (`iframe-app/src/lib/rpc-bridge.ts` +
`iframe-app/src/hooks/use-rpc-bridge.ts`) is separate, hand-written code that
happens to satisfy the same types.

---

## 2. The UI library — `packages/ui` (`@parceliq/ui`)

### Why a shared package instead of copy-pasting components into both apps

Both apps need buttons, cards, dialogs, form inputs, loading/empty/error
states. Duplicating that code means every visual tweak has to happen twice
and will eventually drift. Since this is already a Yarn workspaces monorepo
(needed for the SDK anyway), adding one more shared workspace package costs
almost nothing and means both apps are *structurally* incapable of drifting
apart — they import the exact same `Button`, the exact same color tokens.

### shadcn's philosophy: copy the code in, don't install a black box

Unlike most component libraries, shadcn/ui isn't a package you `npm install`
and treat as opaque — its whole model is "copy this component's source into
your own repo and own it." `packages/ui/src/components/ui/*.tsx` (button,
card, dialog, alert-dialog, dropdown-menu, sheet, table, tabs, input, label,
switch, skeleton, alert, sonner) are all written in that style: thin
wrappers around Radix UI primitives, styled with Tailwind utility classes and
`class-variance-authority` for variants, forwarding refs and spreading props
so consumers can always extend them. There's no shadcn CLI dependency at
runtime — the "installation" already happened when the code was written.

On top of those primitives, `packages/ui/src/components/*.tsx` (no `ui/`
subfolder) has **composed** components that combine primitives into
something both apps actually need directly: `EmptyState`, `LoadingState`,
`ErrorState`, `OfflineBanner`, `StatBadge`, `PageHeader`, `ConfirmDialog`. The
rule of thumb used throughout this repo: if it's generic enough that a
totally different app could plausibly reuse it, it goes in `packages/ui`; if
it's specific to leads/roofing/RPC-log domain concepts, it stays local to
whichever app needs it (`LeadsTable`, `PropertyCard`, `StagePill`, etc. all
live inside `host-site`/`iframe-app`, not the shared package, even though
they're built *from* shared primitives).

### Design tokens and theming — `packages/ui/src/styles/theme.css`

All colors are CSS custom properties defined twice — once under `:root`
(light mode) and once under `.dark` (dark mode) — for things like
`--background`, `--card`, `--primary`, `--destructive`. A Tailwind v4
`@theme inline` block maps each of those onto the `--color-*` naming
convention Tailwind's utility generator expects (e.g. `--color-destructive:
var(--destructive)`), which is what makes classes like `bg-destructive` or
`text-muted-foreground` exist at all. `@custom-variant dark (&:is(.dark
*));` is what makes Tailwind's `dark:` variant (and, more importantly here,
the plain `.dark` selector cascade) work.

Both apps import this **one** file
(`@import "@parceliq/ui/theme.css";` at the top of their own `index.css`,
before `@import "tailwindcss";`), so there is exactly one place brand colors
live for the whole system.

**A real gotcha we hit, worth knowing cold:** Tailwind v4's automatic
content-scanner skips anything that resolves through `node_modules` — which
is exactly where `@parceliq/ui` resolves from in each app (even though it's
really just a symlink to `../packages/ui`). Without an explicit
`@source "../../packages/ui/src";` line in each app's `index.css`, none of
the utility classes *used inside the shared components* would ever be
generated — the color tokens would exist as CSS variables, but classes like
`.bg-destructive` simply wouldn't be in the compiled stylesheet. This is
documented as a standing rule in `packages/ui/.cursor/rules/component-library.mdc`
so it can't be silently reintroduced by adding a third consuming app later
without the same line.

### Dark mode and *where* the `.dark` class actually needs to live

`host-site/src/App.tsx` toggles dark mode with:

```ts
useEffect(() => {
  document.documentElement.classList.toggle('dark', isDark)
}, [isDark])
```

...on `document.documentElement` (`<html>`), not on some wrapper `<div>`
inside the React tree. This matters because `Sheet`, `Dialog`, and
`AlertDialog` all render their actual content through a **React portal**
straight to `document.body` by default — which is outside any wrapper div
entirely. Since the dark-mode colors are just CSS variables scoped by the
`.dark` selector, anything portaled out from under a wrapper div would fall
back to the light `:root` values regardless of app state. Putting `.dark` on
`<html>` sidesteps the problem because portaled content is still a
descendant of `<html>` no matter where in the React tree it was declared.

### Touch targets and mobile — the specific decisions

- `Button`'s base classes include `[@media(pointer:coarse)]:min-h-11` — a
  44px minimum tap target (Apple/Google's baseline guidance) applied *only*
  on touchscreens, via a real CSS media feature query, so desktop/mouse users
  still get the more compact visual sizing.
- `Input` uses `text-base` (16px) below the `sm` breakpoint specifically
  because iOS Safari auto-zooms the whole page on focus for any input with a
  smaller font size — a well-known, easy-to-miss mobile paper cut.
- `Sheet` is full-width/full-height below `sm`, becoming a fixed side panel
  above it — a 75%-width panel on a phone leaves an oddly-thin unusable
  strip and shrinks every tap target inside it further.
- `Dialog`/`AlertDialog` fixed a real bug: `w-full` on a `position: fixed`,
  centered element resolves against the *viewport*, not some sensible
  container, which would put every dialog flush against both screen edges on
  a phone. They use `w-[calc(100%-2rem)]` instead.

---

## 3. `iframe-app` — the ParcelIQ widget

### Entry point and the persisted query cache

`main.tsx` wraps `<App />` in a `QueryClientProvider`. The `QueryClient`
itself (`src/lib/query-client.ts`) is configured with
`@tanstack/query-sync-storage-persister` + `@tanstack/react-query-persist-client`,
which serializes the entire query cache to `localStorage` on every change and
rehydrates it on load. This is what makes the offline-fallback behavior
possible (see `useProperty` below) with almost no extra code — TanStack Query
already keeps the last-known-good `data` around after a failed refetch for
the same query key; persisting that to `localStorage` just means it survives
a full page reload too.

### Standalone vs. embedded mode

`App.tsx` checks `window.parent === window` once (`isStandalone`, memoized).
If true, it's being viewed directly as a normal webpage (e.g. you opened
`localhost:5174` in a tab), so it shows a "preview mode" banner and loads a
default address so there's something to look at. If false, it's inside
someone else's iframe, and it waits for a real `loadProperty` call instead of
guessing.

### The RPC bridge, from the widget's side

`src/lib/rpc-bridge.ts` is deliberately framework-free (no React) so its
logic can be unit tested with plain mock objects instead of a rendered
component tree:

- `getExpectedParentOrigin()` — reads `?parentOrigin=` from the URL.
- `isTrustedParentMessage(event, expectedOrigin)` — the widget's half of the
  origin-check handshake described above.
- `dispatchRpcRequest(data, handlers, respond)` — given raw incoming data, a
  map of method-name → handler functions, and a `respond` callback: if it's
  not a valid request, does nothing; if the method isn't in `handlers`,
  responds with a JSON-RPC error (`-32601`, "method not found"); otherwise
  awaits the handler and responds with either its result or (if it threw) an
  error (`-32000`). This one function is exhaustively unit tested.
- `buildNotify(postToParent)` — returns a typed `notify(event, params)`
  function.

`src/hooks/use-rpc-bridge.ts` is the thin React wrapper: it builds a stable
`notify` function once (via `useState`'s lazy initializer — *not* a
`useRef` mutation during render, which an ESLint rule
(`react-hooks/refs`) correctly flags as unsafe), registers the actual
`window.addEventListener('message', ...)` exactly once in a `useEffect`, and
keeps the *handlers* object fresh via a ref that's updated in a separate
effect on every render — so handlers can freely close over current component
state (like `setCurrentAddress`) without forcing the listener to be
torn down and re-registered constantly.

In `App.tsx`, the three RPC method handlers are:

- **`ping`** → `{ pong: true, timestamp: Date.now() }`. Trivial, mostly
  useful for connectivity testing.
- **`setTheme(theme)`** → calls `applyTheme(theme)` (`src/lib/theme.ts`),
  which toggles `.dark` on the widget's *own* `document.documentElement` and
  sets a `--primary` CSS variable override if a brand color was provided,
  then returns `{ ok: true }`.
- **`loadProperty({ address })`** → sets React state (`setCurrentAddress`,
  which is what the rendered UI actually reacts to), then calls
  `queryClient.fetchQuery(...)` for the same query key `useProperty` uses
  (so there's no duplicate network request), and either throws (if
  Nominatim found nothing — becomes a JSON-RPC error automatically) or
  `notify('propertyLoaded', result)`s and returns the result as the request's
  response.

### Data layer — `useProperty` and the offline fallback

`src/hooks/use-property.ts` wraps `useQuery` and returns a flat shape:
`{ property, isLoading, isEmpty, isError, isOffline, error, refetch }`.
`isEmpty` means the backend returned `null` (a successful query with no
geocode match) — different from `isError`. `isOffline` is the interesting
one: `query.isError && query.data !== undefined` — meaning the most recent
fetch failed, *but* there's still a previously-successful value sitting in
the cache for this exact query key (either from earlier in the session, or
rehydrated from `localStorage` on load). When that's true, `App.tsx` renders
the stale `property` anyway, with an `OfflineBanner` layered on top instead
of a bare error screen.

`src/lib/geocode.ts`'s `fetchProperty(address)` calls the Nest backend's
`GET /properties?address=...` (the Properties module), not Nominatim
directly. That module owns a Postgres cache-through proxy with a real
`User-Agent` — something browsers forbid on `fetch`. Deliberate POC
simplification: a real ParcelIQ vendor would run this API on its own
infrastructure; here it shares a Nest process with the CRM's Leads module
but must not import or touch CRM tables (see § Backend domain siloing).

### The watchlist feature

`src/lib/saved-properties-store.ts` is a tiny localStorage-backed "API"
(`listSavedProperties`, `saveProperty`, `removeSavedProperty`).
`src/hooks/use-saved-properties.ts` wraps it in the same hook pattern:
`useSavedProperties()` (read), `useSaveProperty()` / `useRemoveSavedProperty()`
(mutations that call `queryClient.invalidateQueries(['savedProperties'])` on
success). This exists specifically to demonstrate the mutate-then-invalidate
pattern *inside the widget*, not just on the host side.

### UI components

- **`PropertyCard.tsx`** — the main card: address, `PropertyMap`, county/
  state/place-type/coordinates via `StatRow`, and the "Save to watchlist" /
  "Flag as Distressed" buttons.
- **`PropertyMap.tsx`** — a Leaflet map via `react-leaflet`. Leaflet's default
  marker icon paths are computed relative to its own CSS file's location,
  which breaks once Vite hashes the image assets — fixed by importing the
  marker icon PNGs directly and building an explicit `L.icon(...)`. The tile
  server URL lives behind `src/lib/map-provider.ts` specifically so swapping
  in a paid provider (Mapbox, etc.) later is a one-line change.
- **`StatRow.tsx`** — a tiny label/value row, reused for every stat in the
  card.
- **`WatchlistPanel.tsx`** — renders the saved-properties list with remove
  buttons, using `LoadingState`/`ErrorState`/`EmptyState` from `packages/ui`.

### The bug that mattered most here: the circular resize dependency

The widget reports its own height to the host via a `ResizeObserver` on its
root element, so the host can size the `<iframe>` to fit without an internal
scrollbar. The root element originally had Tailwind's `min-h-screen`
(`min-height: 100vh`) on it. The bug: `100vh` inside an iframe resolves
against *that iframe's own viewport* — which is precisely the dimension the
host was actively setting based on measuring this very element. That's a
circular dependency ("be at least as tall as whatever height I already
happen to be") that makes the resize signal unreliable instead of reflecting
true content height. The fix was simply to stop doing that — only apply a
full-height floor in standalone preview mode, where there's no host resizing
anything to create the loop.

---

## 4. `host-site` — RoofingFlow CRM

### Data layer — leads via the Nest CRM module

`src/lib/leads-store.ts` is a thin `fetch` client against the Nest
**Leads** module:

- `GET /leads?page=&limit=` → `{ data, page, limit, total, totalPages }`
- `POST /leads` → created lead
- `DELETE /leads/:id` → `{ id }`
- `PATCH /leads/:id/stage` → updated lead
- `POST /leads/flag` → matching flagged lead(s)

Base URL comes from `VITE_API_URL` (default `http://localhost:3000`). The
seed tops Postgres up to **~300 leads** so the CRM exercises a realistic
list size.

`src/hooks/use-leads.ts` uses TanStack Query with **per-page keys**
`['leads', { page, limit }]` and `placeholderData: keepPreviousData` so
flipping pages keeps the previous page visible while the next loads.
Mutations (`useAddLead` / `useDeleteLead` / `useFlagLead` /
`useUpdateLeadStage`) apply **optimistic** cache patches, then
`invalidateQueries({ queryKey: ['leads'] })` on settle so every cached
page refreshes. `LeadsPagination` in the CRM UI wires Prev / numbered
pages / Next. Tests mock the HTTP surface with MSW
(`src/test/msw-server.ts`).

### `ParcelIQEmbed.tsx` — the one place the SDK actually gets used

This is the component that justifies the SDK's existence. It:

1. Constructs a `ParcelIQWidget` once per mount (the parent keys this
   component by lead id, so switching leads tears down and rebuilds it
   rather than trying to reuse one instance across unrelated addresses).
2. Passes an `onMessage` callback into the constructor that forwards every
   raw envelope up to `App.tsx` for the live event log.
3. Subscribes to `propertyFlagged`, `propertyLoaded`, and `error` via
   `widget.on(...)`.
4. Drives subsequent address/theme changes through `widget.loadProperty(...)`
   /`widget.setTheme(...)` in separate effects, rather than tearing down and
   recreating the iframe every time either prop changes.
5. Cleans everything up (`widget.destroy()`, unsubscribing every listener) in
   its effect's cleanup function.

### The address-mismatch bug (`propertyFlagged`)

When the "Flag as Distressed" button was first wired up, it sent
`property.address` — Nominatim's *geocoded, reformatted* address string —
back to the host. `leads-store.ts`'s `flagLeadByAddress` does an exact string
match against its own `lead.address` field, which holds the *original,
unformatted* address the CRM knows about. Those two strings essentially
never match exactly (Nominatim expands "350 Fifth Avenue, New York, NY" into
something like "350, 5th Avenue, City of Watervliet, Albany County, New
York, 12189, United States"), so the flag silently matched nothing. The fix:
`iframe-app`'s `handleFlag()` sends back `currentAddress` — the address the
host actually asked it to look up — not the geocoder's normalized version.
The general lesson: when a widget hands data back to a host, it should
reference the identifier the *host* gave *it*, not a value the widget
derived internally, even if that derived value looks similar.

### Responsive leads list — `LeadsTable` + `LeadCard`

A 7-column table (name, company, address, stage, roof age, status, actions)
doesn't fit a phone screen either as a horizontal-scroll table or as crushed
columns. `LeadsTable.tsx` renders **both** a `<div className="sm:hidden">`
card list (`LeadCard.tsx`, one card per lead) and a
`<Table className="hidden sm:table">` — CSS decides which one is visible at
any given viewport width, so there's no JS-based breakpoint detection or
layout thrash. At the intermediate tablet range, the table itself
progressively hides its least-essential columns (Company below `lg`, Roof
age below `md`) rather than falling back to horizontal scroll.

One non-obvious detail: row "selection" (opening the lead detail sheet) is
attached to individual `<TableCell>`s, not the whole `<TableRow>`. That's
because the Stage cell contains a `DropdownMenu`, whose menu content renders
through a React portal — and React bubbles synthetic events from portaled
content up through the *component* tree regardless of where it's actually
mounted in the DOM. A row-level `onClick` would otherwise fire "open this
lead" every single time you picked a stage from the dropdown. Scoping the
click handler to specific non-interactive cells sidesteps the whole class of
bug instead of patching it with `stopPropagation` calls.

### `StagePill.tsx`

A `Badge` (color-coded per stage) wrapped in a `DropdownMenu` trigger. Opening
it lists all five stages with a checkmark on the current one;
picking one calls `onStageChange(lead.id, stage)`, which is wired in
`App.tsx` to `useUpdateLeadStage().mutate(...)`.

### `LeadDetailSheet.tsx`, `EventLogDrawer.tsx` / `RpcEventLog.tsx`

`LeadDetailSheet` is the `Sheet` that opens when a lead is selected: name,
company, stage/material/roof-age badges, the embedded widget
(`ParcelIQEmbed`), and a delete button (behind a `ConfirmDialog`, see below).

`EventLogDrawer` is a bottom-docked, collapsible panel (capped at `22vh`)
with a centered toggle tab; `RpcEventLog` is just the list-rendering logic
(empty state or the list of `{direction, message, timestamp}` entries),
reused as-is inside the drawer. The drawer is `position: fixed`, which is why
`App.tsx` gives the leads-table container its *own* `overflow-y-auto` rather
than relying on page scroll — rows can end up visually behind the drawer
while it's open, and scrolling the table's own container is how you bring
them back into view.

### `AddLeadDialog.tsx` and delete confirmation

A `Dialog` with a small form (name, company, address, stage select, roof
age, roof material) that calls `onAdd(newLeadInput)` on submit. Both delete
entry points (`LeadsTable`'s per-row/per-card delete button and
`LeadDetailSheet`'s "Delete lead" button) go through `ConfirmDialog` — the
shared `AlertDialog`-based composition in `packages/ui` — rather than
deleting immediately on click.

---

## 5. Putting it together — one full user journey

```mermaid
sequenceDiagram
    participant User
    participant CRM as host-site (App/LeadsTable/ParcelIQEmbed)
    participant SDK as ParcelIQWidget (packages/sdk)
    participant Widget as iframe-app (bridge + App.tsx)
    participant PropsAPI as Backend PropertiesModule
    participant LeadsAPI as Backend LeadsModule
    participant Nominatim

    User->>CRM: Click a lead row
    CRM->>SDK: new ParcelIQWidget(...); widget.mount()
    SDK->>Widget: <iframe src="...?parentOrigin=...">
    Widget->>Widget: useRpcBridge registers message listener
    Widget-->>SDK: notify("ready")
    SDK->>SDK: flushQueue() — sends any queued calls
    CRM->>SDK: widget.loadProperty(lead.address)
    SDK->>Widget: request {method:"loadProperty", id, params}
    Widget->>PropsAPI: GET /properties?address=...
    PropsAPI->>Nominatim: cache miss → geocode (real User-Agent)
    Nominatim-->>PropsAPI: address, lat/lon, county, state
    PropsAPI-->>Widget: PropertyResult
    Widget-->>SDK: notify("propertyLoaded", result)
    Widget-->>SDK: response {id, result}
    SDK-->>CRM: promise resolves — onPropertyLoaded fires
    CRM->>CRM: RpcEventLog records both messages

    User->>Widget: Click "Flag as Distressed"
    Widget-->>SDK: notify("propertyFlagged", {address, reason})
    SDK-->>CRM: widget.on("propertyFlagged") fires
    CRM->>LeadsAPI: POST /leads/flag {address, reason}
    LeadsAPI-->>CRM: updated leads list
    CRM->>CRM: useLeads() query invalidated → table re-renders
    CRM->>User: red "Distressed" badge appears, live
```

Every arrow in that diagram corresponds to a real `postMessage` call or a
real function call you can point to in the source — there's no hidden
simulation anywhere in this flow.

---

## 6. Testing strategy, in one paragraph per workspace

- **`packages/sdk`**: `ParcelIQWidget` is tested by actually mounting a real
  `<iframe>` in jsdom, dispatching genuine `MessageEvent`s at
  `window.dispatchEvent` with `source` set to the iframe's own
  `contentWindow`, and spying on `contentWindow.postMessage` to capture
  outgoing request ids before crafting a matching response — this exercises
  the *real* mount/ready-queue/origin-check/call/destroy logic, not a mock of
  it.
- **`packages/ui`**: only the composed components (`EmptyState`,
  `LoadingState`, `ErrorState`, `StatBadge`, `OfflineBanner`, `ConfirmDialog`)
  are tested — the raw Radix-wrapped primitives aren't, since Radix already
  owns that correctness.
- **`iframe-app`**: the bridge's pure dispatch logic is tested with plain
  mock objects (no React); `useProperty`/`useSavedProperties` are tested with
  `renderHook` + MSW intercepting `GET /properties` (and the saved-properties
  localStorage path), including the offline-fallback path.
- **`host-site`**: leads hooks mocked via MSW against `/leads*`, plus
  `LeadsTable`/`EventLogDrawer`/`StagePill` interaction behavior via
  `@testing-library/user-event`.
- **`backend`**: Vitest + `unplugin-swc` (Nest's documented recipe, not Jest).
  Service unit tests mock Prisma with `vi.fn()`; e2e uses `supertest` against
  a real `parceliq_test` Postgres database (`yarn workspace backend test:e2e`).

104 unit tests across 19 files, run together from the repo root with `yarn test`
(Vitest's `test.projects` config aggregates all workspace configs, including
`backend/vitest.config.ts`).

---

## 7. Backend — NestJS + Prisma + domain siloing

One Docker Compose service (`backend` on `:3000`) hosts **two Nest modules
that are treated as separate backends**:

| Module | Domain | Owns | Intended client |
|--------|--------|------|-----------------|
| `LeadsModule` | RoofingFlow CRM | `leads` table, paginated `/leads*` | `host-site` only |
| `PropertiesModule` | ParcelIQ widget | `property_lookup_cache`, `/properties` | `iframe-app` only |

Rules we keep even though they share a process:

- No cross-module domain imports (Properties never touches `Lead`; Leads never
  touches `PropertyLookupCache`).
- Shared infra only: `PrismaModule`, `ConfigModule`, throttling, health,
  exception filter, Swagger.
- Distress flagging stays **widget → RPC → host CRM → `POST /leads/flag`**.
  The widget never calls the Leads API; address-keyed flagging exists because
  the widget only knows an address, not the host's lead id.
- `stage` is a validated string (not a Postgres enum) so it matches the
  frontend `LeadStage` union with no mapping layer.
- Nullable `tenantId` on `Lead` is an unused placeholder for future auth /
  multi-tenancy — no login in this pass.

Bootstrap hardening: zod-validated env, `helmet`, explicit CORS for
`:5173`/`:5174` only, global `ValidationPipe` (whitelist + forbid unknown),
consistent exception filter, `@nestjs/throttler`, Swagger at `/api/docs`.

---

## 8. Where a real production version would differ

- Split Leads and Properties into separate deployables (already siloed as
  Nest modules) — and likely separate databases / vendors for property data.
- Nominatim/OpenStreetMap tiles would be replaced with a paid, parcel-accurate
  property-data and mapping vendor — free geocoding is fine for a demo, not
  for real lead data (the Marcus Ortiz/Albany-County mismatch in the seed
  data is a real, left-in example of free-geocoder imprecision, not a bug).
- Add auth and enforce `tenantId` (column already present).
- The `parentOrigin` query param (client-suppliable) would become a
  server-issued, signed embed token, so the widget's trust decision can't be
  influenced by whoever constructs the iframe URL.
- The JSON-RPC contract would carry an explicit `protocolVersion` field, so a
  host running an old SDK build against a newer widget build (or vice versa)
  fails loudly instead of silently, once host and widget have independent
  release cadences.
- `packages/ui` would become an actually-published, versioned package rather
  than a source-only workspace dependency, once more than one team consumes
  it.
