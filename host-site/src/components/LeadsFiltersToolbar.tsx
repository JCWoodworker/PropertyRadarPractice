import { useEffect, useState } from 'react'
import { Search, X } from 'lucide-react'
import { Button, Input, Label } from '@parceliq/ui'

import { useDebouncedValue } from '../hooks/use-debounced-value'
import { EMPTY_LEADS_FILTERS, type LeadsFiltersValue } from '../lib/leads-filters'
import type { LeadStage } from '../lib/leads-store'
import { US_STATES } from '../lib/us-states'

const STAGES: LeadStage[] = ['Needs Estimate', 'Scheduled', 'Quoted', 'Won', 'Lost']

const SELECT_CLASS =
  'h-10 rounded-md border border-input bg-transparent px-3 text-base shadow-sm sm:text-sm'

export interface LeadsFiltersToolbarProps {
  value: LeadsFiltersValue
  onChange: (value: LeadsFiltersValue) => void
}

function hasActiveFilters(value: LeadsFiltersValue): boolean {
  return Object.values(value).some((v) => v !== '')
}

/**
 * The search box and roof-age min/max fields are free text a user types
 * character-by-character, so they're debounced locally before bubbling up —
 * `onChange` only fires (and therefore only triggers a `GET /leads` refetch)
 * once typing pauses. Stage/State are discrete `<select>` choices and apply
 * immediately, matching how `AddLeadDialog`'s stage picker behaves.
 */
export function LeadsFiltersToolbar({ value, onChange }: LeadsFiltersToolbarProps) {
  const [draft, setDraft] = useState(value)
  const debounced = useDebouncedValue(draft, 350)

  useEffect(() => {
    onChange(debounced)
    // `onChange` intentionally excluded — it's expected to be a fresh
    // closure each render in `App`, and re-running this effect for that
    // reason alone (rather than for a genuine debounced-value change) would
    // defeat the debounce.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced])

  function handleClear() {
    setDraft(EMPTY_LEADS_FILTERS)
  }

  return (
    <div className="flex flex-col gap-3 border-b border-border p-3 sm:flex-row sm:flex-wrap sm:items-end sm:gap-4 sm:p-4">
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:min-w-56">
        <Label htmlFor="leads-search">Search</Label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            id="leads-search"
            placeholder="Name, company, or address…"
            className="pl-9"
            value={draft.search}
            onChange={(e) => setDraft({ ...draft, search: e.target.value })}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="leads-stage-filter">Stage</Label>
        <select
          id="leads-stage-filter"
          className={SELECT_CLASS}
          value={draft.stage}
          onChange={(e) => setDraft({ ...draft, stage: e.target.value as LeadStage | '' })}
        >
          <option value="">All stages</option>
          {STAGES.map((stage) => (
            <option key={stage} value={stage}>
              {stage}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="leads-state-filter">State</Label>
        <select
          id="leads-state-filter"
          className={SELECT_CLASS}
          value={draft.state}
          onChange={(e) => setDraft({ ...draft, state: e.target.value })}
        >
          <option value="">All states</option>
          {US_STATES.map((state) => (
            <option key={state.code} value={state.code}>
              {state.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="leads-roof-age-min">Roof age (years)</Label>
        <div className="flex items-center gap-2">
          <Input
            id="leads-roof-age-min"
            type="number"
            min={0}
            placeholder="Min"
            className="w-20"
            value={draft.roofAgeMin}
            onChange={(e) => setDraft({ ...draft, roofAgeMin: e.target.value })}
          />
          <span className="text-sm text-muted-foreground" aria-hidden="true">
            –
          </span>
          <Input
            aria-label="Roof age max (years)"
            type="number"
            min={0}
            placeholder="Max"
            className="w-20"
            value={draft.roofAgeMax}
            onChange={(e) => setDraft({ ...draft, roofAgeMax: e.target.value })}
          />
        </div>
      </div>

      {hasActiveFilters(draft) && (
        <Button type="button" variant="ghost" size="sm" onClick={handleClear}>
          <X className="size-4" aria-hidden="true" />
          Clear filters
        </Button>
      )}
    </div>
  )
}
