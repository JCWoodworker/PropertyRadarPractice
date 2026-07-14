import type { LeadStage } from './leads-store'

/** Draft shape held by `LeadsFiltersToolbar` — all free-text fields stay strings until parsed for the API call in `App`. */
export interface LeadsFiltersValue {
  search: string
  stage: LeadStage | ''
  state: string
  roofAgeMin: string
  roofAgeMax: string
}

export const EMPTY_LEADS_FILTERS: LeadsFiltersValue = {
  search: '',
  stage: '',
  state: '',
  roofAgeMin: '',
  roofAgeMax: '',
}
