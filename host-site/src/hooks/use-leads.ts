import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  addLead,
  deleteLead,
  flagLeadByAddress,
  listLeads,
  updateLeadStage,
  type Lead,
  type LeadStage,
  type NewLeadInput,
} from '../lib/leads-store'

const LEADS_KEY = ['leads'] as const

export interface UseLeadsResult {
  leads: Lead[]
  isLoading: boolean
  isEmpty: boolean
  isError: boolean
  error: Error | null
  refetch: () => void
}

/** Single source of truth for the leads list's data-fetching states — see `.cursor/rules/data-fetching.mdc`. */
export function useLeads(): UseLeadsResult {
  const query = useQuery({ queryKey: LEADS_KEY, queryFn: listLeads })

  return {
    leads: query.data ?? [],
    isLoading: query.isLoading,
    isEmpty: query.isSuccess && (query.data?.length ?? 0) === 0,
    isError: query.isError,
    error: query.error instanceof Error ? query.error : null,
    refetch: () => void query.refetch(),
  }
}

export function useAddLead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: NewLeadInput) => addLead(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: LEADS_KEY })
    },
  })
}

export function useDeleteLead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteLead(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: LEADS_KEY })
    },
  })
}

/** Called from the Stage pill's dropdown menu in the leads table. */
export function useUpdateLeadStage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: LeadStage }) => updateLeadStage(id, stage),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: LEADS_KEY })
    },
  })
}

/**
 * Called internally by `ParcelIQEmbed` whenever the SDK's `propertyFlagged`
 * notification fires — the host-side half of the bidirectional flow.
 */
export function useFlagLead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ address, reason }: { address: string; reason: string }) => flagLeadByAddress(address, reason),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: LEADS_KEY })
    },
  })
}
