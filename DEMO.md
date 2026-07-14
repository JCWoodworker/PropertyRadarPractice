# Interview Demo Script

A ~3-minute walkthrough for showing this POC live. Setup: `yarn dev` running
from the repo root, both tabs open (`:5173` host CRM, `:5174` widget preview
if you want to show it standalone first).

## The Hook

> "PropertyRadar today relies on a REST API, webhooks, and Zapier — there's
> no public embeddable widget yet. Given the role is about engineering a UI
> library and widgets, I wanted to explore what that next evolution could
> look like architecturally. So instead of just talking about it in the
> interview, I built a working POC this weekend."

## The Architecture (30 seconds)

Open the repo structure. Point out:

- It's a small monorepo: two independently-deployed apps (`host-site`,
  `iframe-app`) plus two shared packages.
- `packages/sdk` (`@parceliq/embed-sdk`) is the actual product — a
  Stripe-Elements-style embed SDK a host application installs like a
  library, not a raw `<iframe>` tag.
- `packages/ui` (`@parceliq/ui`) is a shared shadcn/Radix/Tailwind component
  library consumed by *both* apps, so the widget and the host never drift
  in look-and-feel even though they're deployed completely separately.

> "This is the part I actually care about for this role — proving I can
> design a component library that stays consistent across two totally
> separate deployable surfaces, not just style one app."

## The Demo

1. Open **RoofingFlow CRM** (`:5173`) — a fake CRM for roofing contractors,
   deliberately modeled on PropertyRadar's own Home & Property Services
   plays (aging systems, equity upgrades) rather than a generic leads list.
2. Point at the **Live JSON-RPC Event Log** panel — empty so far.
3. Click a lead. Watch the log fire `loadProperty` — the widget mounts,
   geocodes the address via OpenStreetMap Nominatim, and renders a
   `PropertyCard` with a Leaflet pin drop, live.
4. Toggle the CRM's light/dark switch. Watch `setTheme` fire in the log —
   the widget instantly re-skins to match, no reload.

## The Magic Trick (the one that matters)

5. Inside the widget, click **"Flag as Distressed."** Watch `propertyFlagged`
   fire in the log — a JSON-RPC *notification*, not a request/response —
   and a red **Distressed** badge appears on that lead's row in the CRM's
   own table, live, with zero page reload.

> "This is the part that proves the bridge isn't read-only. The widget can
> hand real signal back to the host's own data — which is exactly the kind
> of 'distress signal' PropertyRadar already sells as a core feature."

## Two asides worth mentioning if there's time

- **Offline resilience**: the widget persists its query cache to
  `localStorage`. If a lookup's network request fails but a cached result
  exists, it shows the cached property with a "you appear to be offline"
  banner instead of a blank error — the same instinct behind the
  offline-capable caching in a past production app that scaled to 9,000
  users.
- **The agentic engineering angle**: open
  `packages/sdk/.cursor/rules/json-rpc-protocol.mdc`. "I wrote this so any
  engineer prompting an AI agent to add a new event between the host and
  widget automatically gets the origin-check security and the correct
  envelope shape enforced — it raises the ceiling for the whole team, not
  just for me."

## The Close

> "This architecture would let a third-party CRM embed PropertyRadar's data
> directly in its own UI — strict security boundaries via origin
> validation, zero CSS collisions via a shared design-token system, and no
> loss of the host's own brand polish, in both directions."
