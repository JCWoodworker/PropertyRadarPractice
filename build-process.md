# How This Actually Got Built

## Part 1: The Fun Version (read this one first)

Here's the honest version of how this happened, no résumé-speak.

I was doing a recruiter screen for PropertyRadar, ran it by Gemini afterward
to sanity-check my read on the role, and Gemini came back with a genuinely
good idea: spend a weekend building a tiny proof-of-concept of what an
"embeddable widget" product might look like for them, since the role is
about engineering a UI library and widgets. Gemini's version of the plan was
appropriately scoped for two hours: a Vite React app, a plain HTML file with
an iframe, and a hand-rolled `postMessage` call that changes a background
color. Cute. Proof you know what `postMessage` is.

I decided that wasn't going to be enough, and — more importantly — I decided
to actually *use* an AI coding agent the way I'd use one on a real team,
instead of the way most people use one, which is typing "build me an app"
into a chat box and hoping. Here's the difference, concretely:

**I made the agent do real research before writing code.** Before picking a
data source for the widget, I had it look up PropertyRadar's actual public
integrations (turns out: REST API + webhooks + Zapier, no public embeddable
widget today — so this POC is a bet on a plausible next step, not a copy of
something that exists) and then live-test candidate free APIs with `curl`
*before* committing to one. The US Census API, which I expected to just
work, came back with "a valid key must be included with each data API
request" — a real dead end discovered in about ninety seconds instead of
after twenty minutes of building against it. OpenStreetMap's Nominatim
geocoder, tested the same way, just worked. That's the difference between
research and vibes.

**I made the agent ask me real questions instead of guessing.** Shared UI
library or duplicated one? Vitest or Jest (or, as I initially and
incorrectly asked for, both)? Leaflet or Mapbox? Which PropertyRadar
customer vertical should the fake CRM even pretend to be? Every one of
those is a decision that changes the shape of the codebase, and every one
of those got surfaced to me explicitly as a choice, with a recommendation
and a reason, instead of silently picked.

**I brought in a second AI as an adversarial reviewer, on purpose.** I fed
the plan to Gemini and asked it to poke holes using its own knowledge of the
company. It came back with real improvements — theme the CRM around an
actual PropertyRadar customer type instead of a generic leads list, add a
*bidirectional* feature (not just the widget reading data — the widget
writing a "distressed" signal back to the host live) — and I didn't take
all of it. The Mapbox suggestion, for instance, I deliberately downgraded to
"build with Leaflet, structure it so Mapbox is a one-line swap later,"
because requiring an API key before a live demo works is a self-inflicted
risk with no real upside for a POC. Good feedback gets triaged, not
rubber-stamped.

**And then it actually got built, tested, and it actually broke in a couple
of places — which is the most honest part of this whole document.** Tailwind
v4 silently failed to generate any utility classes for the shared component
library because its content-scanner skips `node_modules`, which is
technically where a symlinked workspace package resolves from even though
it's really just `../packages/ui`. The theme toggle went into a literal
infinite `postMessage` loop the first time I clicked it, because a fresh
object literal was being created every render and used as an effect
dependency. Both got caught by actually running the thing in a real browser
and looking at the network/console output, not by assuming the code was
right because it compiled. That loop is now a documented rule
(`iframe-app/.cursor/rules/react-patterns.mdc`) so it doesn't come back.

If you want the receipts — every phase, every command, every real decision
and why — keep reading. If you just wanted the pitch: I don't type one
prompt and ship whatever comes out. I direct an agent through research,
planning, review, and verification the same way I'd manage a very fast,
very literal junior engineer. That's the actual skill.

---

## Part 2: The Detailed Build Log

### Phase 0 — Starting state

Both `host-site` and `iframe-app` began as untouched `yarn create vite`
scaffolds (React + TypeScript template): default `App.tsx` with the Vite/React
counter demo, `App.css`, `src/assets/{react,vite}.svg`, and independent
`package.json`/`yarn.lock` per app. No shared code, no monorepo tooling, no
styling framework, no tests.

### Phase 1 — Research

- Read PropertyRadar's public site and developer docs
  ([developers.propertyradar.com](https://developers.propertyradar.com/),
  [Integrations help doc](https://help.propertyradar.com/en/articles/6971590-integrations))
  to confirm: their current public surface is a REST API, webhooks, and
  Zapier — no public embeddable widget product exists today. This POC is
  framed explicitly as a bet on a *plausible next step*, not a clone.
- Live-tested three geocoding/data-source candidates with `curl` before
  writing any app code:
  - `api.census.gov/data/...` → HTTP 200 with body `"A valid key must be
    included with each data API request."` — rejected.
  - `datausa.io/api/data` → 404 on the endpoint shape tried — rejected.
  - `nominatim.openstreetmap.org/search` → real JSON results, no key,
    reasonable rate limits for light use — **selected**.
  - Also spot-checked `overpass-api.de` for a "nearby amenities" stretch
    goal; got HTTP 406 through the sandbox's network layer and decided it
    wasn't worth debugging for a stretch feature — descoped in favor of the
    simpler, more reliable Leaflet map addition instead.

### Phase 2 — Planning iterations

1. **Plan v1**: monorepo, `@parceliq/ui` shared component package,
   `@parceliq/embed-sdk` package, Nominatim-backed widget, RoofingFlow CRM
   persona (chosen via an explicit multiple-choice question), Leaflet map
   (chosen "swappable" over Mapbox to avoid an API-key dependency before the
   demo works), full bidirectional JSON-RPC bridge (chosen over a
   Gemini-original one-way toy demo).
2. **Testing/standards addendum**: added after being asked to write tests
   for everything with Vitest + RTL. Jest was explicitly *not* added
   alongside Vitest — the two solve the same problem, and running both would
   mean duplicate config for no benefit; this was surfaced as a question and
   confirmed rather than silently decided.
3. **Gemini review round**: fed the plan to Gemini for outside critique.
   Kept: the monorepo/shared-UI-package structure, the live RPC event log,
   the hook pattern, Vitest+RTL+MSW. Adopted with modification: rebrand the
   CRM to a specific vertical (chosen: Home Services/Roofing, over Real
   Estate Investor or Residential Agent), add the bidirectional
   `propertyFlagged` "distress" event, add a map. Adopted with a *different*
   implementation than suggested: Leaflet instead of Mapbox, specifically to
   avoid an API-key setup step. Added independently of Gemini's suggestions:
   an offline-cache fallback in the widget, and a flagship
   `json-rpc-protocol.mdc` Cursor rule.

### Phase 3 — Boilerplate teardown

Deleted `src/App.css` and `src/assets/` from both apps; replaced `App.tsx`
with a minimal placeholder; replaced `index.css` with a Tailwind import;
removed the unused `public/icons.svg` from both apps; updated `index.html`
titles to "RoofingFlow CRM" / "ParcelIQ Widget".

### Phase 4 — Monorepo conversion

- Removed each app's own `node_modules`/`yarn.lock`.
- Added a root `package.json` with `"workspaces": ["host-site", "iframe-app",
  "packages/*"]`, a `concurrently`-based `dev` script, and root
  `test`/`test:watch`/`test:coverage` scripts.
- Scaffolded `packages/sdk` (`@parceliq/embed-sdk`) and `packages/ui`
  (`@parceliq/ui`) as source-only workspaces (no build step — Vite consumes
  the TypeScript/TSX source directly from the workspace, standard for a
  monorepo in dev).
- **Real gotcha hit here**: the plan's original intent was to use the
  `workspace:*` version protocol for internal deps. `yarn install` failed
  immediately with `Couldn't find package "@parceliq/ui@workspace:*" ... on
  the "npm" registry` — that protocol is a Yarn Berry/pnpm feature, not
  supported by the Yarn Classic (1.22) installed in this environment. Fixed
  by using plain `"*"` version ranges for intra-repo deps instead, which
  Yarn Classic resolves against the local workspace automatically.

### Phase 5 — `packages/ui`

- Hand-authored the shadcn-pattern component set (`button`, `card`, `badge`,
  `table`, `tabs`, `sheet`, `dialog`, `skeleton`, `alert`, `input`, `label`,
  `switch`, a `sonner` toast wrapper) rather than running the `shadcn` CLI,
  since the CLI needs an interactive/network-heavy init this sandboxed
  environment isn't well suited for — the output is the same either way
  (shadcn's own model is "copy the source into your repo," not consume a
  black-box package).
- Wrote `theme.css` with Tailwind v4 `@theme inline` tokens (OKLCH colors,
  light + dark) as the single source of design tokens both apps import.
- Added composed, genuinely-shared components: `EmptyState`, `LoadingState`,
  `ErrorState`, `StatBadge`, `PageHeader`, `OfflineBanner`.
- **Real bug hit and fixed here**: after wiring everything up, the
  `destructive`/`primary`/`card` color utilities (`bg-destructive`, etc.)
  silently produced *no* CSS at all, while utilities used directly in each
  app's own source (`bg-background`, `bg-muted/40`) worked fine. Diagnosed
  via the browser devtools protocol (checking `getComputedStyle` and walking
  the live `CSSStyleSheet` rules directly) rather than guessing — confirmed
  the CSS variables existed but no `.bg-destructive` rule existed anywhere
  in the compiled output. Root cause: Tailwind v4's automatic content
  scanner skips anything resolved through `node_modules`, which is exactly
  where `@parceliq/ui` resolves from (even though it's just a symlink to
  `../packages/ui`). Fixed with an explicit `@source "../../packages/ui/src"`
  directive in each app's `index.css`. **Also discovered that this fix only
  took effect after a full Vite dev-server restart, not a hot-reload** —
  `@source` changes Tailwind's static scan configuration, which isn't picked
  up by the CSS hot-reload path. Documented in
  `packages/ui/.cursor/rules/component-library.mdc` so it isn't rediscovered
  the hard way again.

### Phase 6 — `packages/sdk`

- `types.ts`: `RpcMethodMap` (host→widget requests: `ping`, `loadProperty`,
  `setTheme`) and `RpcEventMap` (widget→host notifications: `ready`,
  `propertyLoaded`, `error`, `resize`, `propertyFlagged`) as discriminated
  unions, plus `isJsonRpcRequest`/`isJsonRpcResponse`/`isJsonRpcNotification`
  type guards.
- `rpc.ts`: a dependency-free `TypedEmitter`, `createRequestId`, and
  `buildNotification`.
- `widget.ts`: the public `ParcelIQWidget` class — mount/destroy lifecycle,
  a ready-handshake call queue (calls made before the widget signals `ready`
  are queued and flushed automatically), per-call timeouts, origin
  validation on every incoming message, and an `onMessage` debug hook used
  later to build the host's live event log from real SDK traffic instead of
  a simulated one.
- **Real type error hit here**: `TypedEmitter<EventMap extends
  Record<string, unknown>>` failed to compile against `RpcEventMap`
  ("Index signature for type 'string' is missing") — a plain TypeScript
  `interface` doesn't structurally satisfy `Record<string, unknown>` without
  an index signature. Fixed by relaxing the generic constraint to `extends
  object`, which is all the emitter actually needs.

### Phase 7 — Hooks

Added the `{ data, isLoading, isEmpty, isError, error, refetch }` hook shape
(plus `isOffline` in the widget's case) consistently:

- `iframe-app`: `useProperty` (Nominatim lookup), `useSavedProperties` /
  `useSaveProperty` / `useRemoveSavedProperty` (localStorage-backed
  watchlist, demonstrating the mutation-then-invalidate pattern on the
  widget side too, not just the host).
- `host-site`: `useLeads`, `useAddLead`, `useDeleteLead`, and `useFlagLead`
  — the last one is the host-side half of the bidirectional flow, called
  whenever the SDK's `propertyFlagged` event fires.

### Phase 8 — The widget (`iframe-app`)

- `lib/rpc-bridge.ts`: framework-free dispatch logic
  (`dispatchRpcRequest`, `isTrustedParentMessage`,
  `getExpectedParentOrigin`) deliberately kept out of React so it's testable
  with plain mock objects.
- `hooks/use-rpc-bridge.ts`: the React glue — registers the `message`
  listener once, keeps handlers fresh via a ref synced from an effect (see
  the ESLint fix below), sends `ready` on mount.
- Added the parent-origin handshake: `ParcelIQWidget.mount()` appends
  `?parentOrigin=<host origin>` to the iframe `src`; the widget reads it
  back out of its own `location.search` to know which origin to trust —
  this is what makes the origin check on both sides actually meaningful
  instead of hardcoded.
- `PropertyMap.tsx`: Leaflet + `react-leaflet`. Hit the well-known
  Leaflet-under-a-bundler gotcha immediately (default marker icon paths are
  computed relative to the CSS file's location, which breaks once Vite
  hashes the image assets) — fixed by importing the marker icon assets
  explicitly and building an `L.icon()` from the resolved URLs.
- **Dependency version mismatch caught before it caused a problem**:
  planned `react-leaflet@^4.2.1`, but the app is on React 19 —
  `react-leaflet` v4 only supports React 16–18; v5 is the one that requires
  React 19. Caught via a web search before installing, not after a runtime
  crash.
- Added the offline-resilience fallback: `@tanstack/query-sync-storage-persister`
  persists the query cache to `localStorage`; `useProperty` derives
  `isOffline` from `query.isError && query.data !== undefined` (TanStack
  Query already keeps the last successful value around on a failed
  refetch — no extra plumbing needed, just had to recognize the built-in
  behavior).
- Added the "Flag as Distressed" button, sending a `propertyFlagged`
  *notification* (no `id`, no response expected) up to the host.

### Phase 9 — The host (`host-site`)

- Rebuilt the mock leads dataset around seven roofing-specific leads
  (roof age, roof material, last inspection date, stage) at real,
  well-known US addresses chosen specifically because they geocode
  reliably via Nominatim.
- `ParcelIQEmbed.tsx`: the React wrapper around `ParcelIQWidget` — mounts
  once (keyed by lead id from the parent), then drives subsequent
  address/theme changes through the SDK's own `loadProperty`/`setTheme`
  calls rather than remounting the iframe.
- `RpcEventLog.tsx`: renders the exact traffic captured by the SDK's
  `onMessage` hook — this is real captured traffic, not a scripted
  simulation.
- **The infinite-loop bug**, found by actually clicking through the app in
  a real browser and watching the event log fill up to its 60-entry cap
  almost instantly: `theme` was being constructed as a fresh object literal
  on every render of `App`, and `ParcelIQEmbed`'s `setTheme` effect
  depended on that object's *identity*. Every `setTheme` call produced a
  log entry, which triggered a state update, which re-rendered `App`, which
  created a new `theme` object, which re-fired the effect — forever. Fixed
  by wrapping the theme object in `useMemo(() => ({...}), [isDark])` so its
  identity is stable unless `isDark` actually changes. Documented as a rule
  in `iframe-app/.cursor/rules/react-patterns.mdc` so the specific failure
  mode is named, not just "be careful with effects."

### Phase 10 — Testing

Vitest + React Testing Library across all four workspaces, no Jest, unified
under a root `vitest.config.ts` using `test.projects` (the `defineWorkspace`
file approach was tried first, worked, but printed a deprecation warning
pointing at `test.projects` as the current API — switched immediately
rather than shipping a known-deprecated pattern).

71 tests, all passing:

- `packages/sdk` (27 tests): JSON-RPC type guards, the `TypedEmitter`, and
  — most importantly — `ParcelIQWidget` itself: the ready-handshake queue,
  origin validation (accepts trusted messages, silently drops untrusted
  ones), call timeout/resolve/reject, and an explicit test asserting
  `propertyFlagged` reaches a registered `.on()` handler as a notification.
- `packages/ui` (15 tests): rendering behavior for the composed components
  (`EmptyState`, `LoadingState`, `ErrorState`, `StatBadge`,
  `OfflineBanner`) — deliberately *not* re-testing the raw Radix-wrapped
  primitives, since Radix already owns that correctness.
- `iframe-app` (19 tests): the pure `rpc-bridge` dispatch logic with plain
  mocks, `useProperty` against a mocked Nominatim via MSW (including the
  offline-fallback path — mock a success, then mock a failure for the same
  address, and assert the stale data survives with `isOffline: true`), and
  the localStorage-backed watchlist hooks.
- `host-site` (10 tests): the leads hooks (including a specific test that
  `useFlagLead` — the host-side handler for `propertyFlagged` — actually
  marks the right lead as distressed) and `LeadsTable` interaction behavior
  via `@testing-library/user-event`.

MSW was used where there's a real network call to intercept (Nominatim in
`iframe-app`); `host-site`'s mock "leads API" is a plain in-memory async
function rather than a `fetch` call, so there's nothing there for MSW to
usefully intercept — tested directly against the store module instead, with
a test-only `__resetLeadsForTests()` export to keep tests isolated from each
other's mutations.

### Phase 12 — Real NestJS + Postgres backend

Replaced the in-memory `leads-store` and browser-side Nominatim calls with a
NestJS + Prisma + Postgres stack. Postgres and the Nest app run in Docker
Compose; the Vite frontends stay native. One Nest process hosts two
**siloed** domains — `LeadsModule` (CRM) and `PropertiesModule` (widget
property cache) — sharing infra only, so we don't pretend the embed vendor
and host CRM share a data model. Distress flagging still goes widget → RPC
→ host → `POST /leads/flag`. Backend tests use Vitest + `unplugin-swc` (not
Jest) so `yarn test` at the root covers all five workspaces.

### Phase 11 — Cursor rules

Added `.cursor/rules/*.mdc` files (not a legacy single root `.cursorrules`)
to all four workspaces. The flagship is
`packages/sdk/.cursor/rules/json-rpc-protocol.mdc` — it encodes the entire
message contract (add to `RpcMethodMap`/`RpcEventMap` first, requests vs.
notifications, mandatory origin validation, naming convention) with a
worked before/after example for adding a new event. Every other rule file
(`react-patterns.mdc`, `data-fetching.mdc`, `testing.mdc`, and a
component-library rule for `packages/ui`) either codifies a convention used
throughout this build or — in two specific cases (the Tailwind `@source`
gotcha, the `theme` object-identity loop) — documents an actual bug that was
found and fixed, so an agent (or a human) working on this later doesn't
rediscover it from scratch.

### Phase 12 — Final verification pass

Before calling this done: ran `tsc --noEmit` against all four workspaces
(zero errors), `eslint` against all four (zero errors after two real fixes
— see the Decision Log), and the full 71-test suite from the repo root in
one command. Also drove the running apps in a real browser via CDP to
confirm the JSON-RPC event log shows genuine `ready` → `loadProperty` →
`propertyLoaded` → `resize` → `setTheme` traffic end-to-end between two
independently-running dev servers, not just passing unit tests in isolation.

## Decision Log

| Decision | Options considered | Choice | Why |
|---|---|---|---|
| Test runner | Vitest, Jest, both | Vitest only | Jest and Vitest solve the same problem; running both means duplicate config for no benefit. Vitest's API is Jest-compatible, so nothing is lost. |
| UI library sharing | Shared `packages/ui` workspace, duplicated component trees per app | Shared workspace | Monorepo tooling was already needed for the SDK package, so a second shared package costs almost nothing — and duplicating a UI library directly contradicts the "I engineer reusable UI libraries" pitch for the role. |
| Geocoding/data source | US Census API, DataUSA, Nominatim, static mock data | Nominatim | Verified live with `curl` before committing — Census now requires a key, DataUSA's endpoint shape didn't match, Nominatim just worked, no key, no signup. |
| Mapping library | Mapbox GL JS, Leaflet, Leaflet-but-swappable | Leaflet, structured to swap | Mapbox needs a free-tier signup before it renders anything — a real risk for a live demo. Leaflet + OpenStreetMap tiles work with zero setup; the tile config is isolated behind one file so swapping to Mapbox later is a one-line change. |
| CRM vertical/branding | Generic "Cirrus CRM," Home Services/Roofing, Real Estate Investor, Residential Agent | Home Services/Roofing ("RoofingFlow CRM") | Maps directly to PropertyRadar's own Home & Property Services plays (Aging Systems, Equity Upgrades) — more concrete and recognizable than a generic leads list. |
| RPC bridge depth | One-way toy demo (Gemini's original 2-hour spec), full bidirectional bridge, full bidirectional + separate shared-types package | Full bidirectional bridge | A one-way demo doesn't prove much; a fully separate types package was more structure than the chosen SDK-package approach already provides, since the types already live in `packages/sdk` and are shared via type-only imports. |
| SDK/monorepo structure | Two fully independent apps with a duplicated bridge script, a single shared TS module inside `host-site`, a real Yarn workspaces monorepo with a dedicated `packages/sdk` | Yarn workspaces monorepo | Mirrors how PropertyRadar would actually ship this as a real npm package, and made the shared-UI-library decision above essentially free to add. |
| Workspace protocol | `workspace:*` (Yarn Berry/pnpm syntax) | Plain `"*"` version ranges | `workspace:*` isn't supported by the Yarn Classic (1.22) installed in this environment — failed on the first `yarn install` with a clear error, fixed immediately. |
| Bidirectional "aha" feature | Read-only widget, widget can write a "flag as distressed" event back to the host | Added `propertyFlagged` | Directly echoes PropertyRadar's own "30+ Distress Signals" marketing language, and is the single best proof that the bridge isn't just a fancy iframe — it can change the host's own data live. |
| ORM | Prisma, TypeORM | Prisma | Schema-driven migrations + generated types are the right DX for this demo's scale; TypeORM's large-dataset edge doesn't matter here. |
| Backend infra | Native Nest + local Postgres, full Docker for everything, Docker for Postgres+Nest only | Docker Compose for Postgres + Nest; Vite apps stay native | One-command `yarn dev` still works; frontends keep fast HMR; backend matches a realistic deployable shape. |
| CRM vs widget backends | Two Nest apps, one Nest app with mixed logic, one Nest app with siloed modules | One process, two siloed modules (`LeadsModule` / `PropertiesModule`) | Avoids standing up a second service for the POC, without pretending the CRM and embed vendor share a domain model — no cross-module table access; distress still goes widget → RPC → host → `/leads/flag`. |
| Backend test runner | Jest (Nest default), Vitest | Vitest + `unplugin-swc` | Matches the rest of the monorepo; Nest's own Vitest recipe covers decorator metadata. |
| Leads list scale | Keep 7 seed rows; client-side filter; server page/limit | Seed ~300 + `GET /leads?page&limit` + per-page TanStack keys + optimistic mutations | Demonstrates real list UX and Query caching/invalidation without inventing a second dataset layer. |

## What I'd do differently in production

- Split the co-located Leads / Properties Nest modules into separate
  deployables (and likely separate datastores) — the module boundary is
  already drawn that way on purpose.
- Swap Nominatim/OpenStreetMap tiles for a paid, parcel-accurate property
  and mapping data vendor — the free tier here is right for a demo, wrong
  for real lead data (see the Marcus Ortiz/Albany-County geocoding mismatch
  in the seed data, a real example of free-geocoder imprecision left in on
  purpose rather than cherry-picked away).
- Enforce auth and multi-tenancy on the existing `tenantId` placeholder.
- Replace the client-suppliable `parentOrigin` query param with a
  server-issued, signed embed token so the widget's origin allowlist can't
  be influenced by whoever constructs the iframe URL.
- Add a `sandbox` attribute audit and a Content-Security-Policy on the
  widget's own page, beyond the `allow-scripts allow-same-origin
  allow-popups allow-forms` currently set on the host's `<iframe>`.
- Version the JSON-RPC contract explicitly (e.g. a `protocolVersion` field)
  so a host running an older SDK build and a widget running a newer one
  fail loudly instead of silently, once this is a real product with
  independent release cadences on each side.
- Build the shared component library as an actually-published, versioned
  package rather than a source-only workspace dependency, once there's more
  than one consuming team.
