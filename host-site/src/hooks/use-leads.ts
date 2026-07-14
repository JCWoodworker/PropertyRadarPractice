import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query'

import {
  addLead,
  deleteLead,
  flagLeadByAddress,
  LEADS_PAGE_SIZE,
  listLeads,
  updateLeadStage,
  type Lead,
  type LeadStage,
  type NewLeadInput,
  type PaginatedLeads,
} from '../lib/leads-store'

export const LEADS_KEY = ['leads'] as const

function leadsQueryKey(page: number, limit = LEADS_PAGE_SIZE) {
  return [...LEADS_KEY, { page, limit }] as const
}

function mapLeadPages(
  queryClient: QueryClient,
  map: (page: PaginatedLeads) => PaginatedLeads,
): void {
  const entries = queryClient.getQueriesData<PaginatedLeads>({ queryKey: LEADS_KEY })
  for (const [key, data] of entries) {
    if (!data) continue
    queryClient.setQueryData(key, map(data))
  }
}

export interface UseLeadsResult {
  leads: Lead[]
  page: number
  limit: number
  total: number
  totalPages: number
  isLoading: boolean
  isFetching: boolean
  isEmpty: boolean
  isError: boolean
  error: Error | null
  refetch: () => void
}

/** Single source of truth for the leads list's data-fetching states — see `.cursor/rules/data-fetching.mdc`. */
export function useLeads(page: number): UseLeadsResult {
  const limit = LEADS_PAGE_SIZE
  const query = useQuery({
    queryKey: leadsQueryKey(page, limit),
    queryFn: () => listLeads(page, limit),
    placeholderData: keepPreviousData,
  })

  const data = query.data

  return {
    leads: data?.data ?? [],
    page: data?.page ?? page,
    limit: data?.limit ?? limit,
    total: data?.total ?? 0,
    totalPages: data?.totalPages ?? 0,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isEmpty: query.isSuccess && (data?.data.length ?? 0) === 0 && (data?.total ?? 0) === 0,
    isError: query.isError,
    error: query.error instanceof Error ? query.error : null,
    refetch: () => void query.refetch(),
  }
}

export function useAddLead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: NewLeadInput) => addLead(input),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: LEADS_KEY })
      const previous = queryClient.getQueriesData<PaginatedLeads>({ queryKey: LEADS_KEY })
      const optimistic: Lead = {
        ...input,
        id: `optimistic-${crypto.randomUUID()}`,
        distressFlag: false,
        distressReason: null,
      }
      const page1Key = leadsQueryKey(1)
      const page1 = queryClient.getQueryData<PaginatedLeads>(page1Key)
      if (page1) {
        queryClient.setQueryData<PaginatedLeads>(page1Key, {
          ...page1,
          data: [optimistic, ...page1.data].slice(0, page1.limit),
          total: page1.total + 1,
          totalPages: Math.ceil((page1.total + 1) / page1.limit),
        })
      }
      return { previous }
    },
    onError: (_err, _input, context) => {
      context?.previous.forEach(([key, data]) => {
        queryClient.setQueryData(key, data)
      })
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: LEADS_KEY })
    },
  })
}

export function useDeleteLead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteLead(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: LEADS_KEY })
      const previous = queryClient.getQueriesData<PaginatedLeads>({ queryKey: LEADS_KEY })
      mapLeadPages(queryClient, (page) => {
        const nextData = page.data.filter((lead) => lead.id !== id)
        if (nextData.length === page.data.length) return page
        const total = Math.max(0, page.total - 1)
        return {
          ...page,
          data: nextData,
          total,
          totalPages: total === 0 ? 0 : Math.ceil(total / page.limit),
        }
      })
      return { previous }
    },
    onError: (_err, _id, context) => {
      context?.previous.forEach(([key, data]) => {
        queryClient.setQueryData(key, data)
      })
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: LEADS_KEY })
    },
  })
}

/** Called from the Stage pill's dropdown menu in the leads table. */
export function useUpdateLeadStage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: LeadStage }) => updateLeadStage(id, stage),
    onMutate: async ({ id, stage }) => {
      await queryClient.cancelQueries({ queryKey: LEADS_KEY })
      const previous = queryClient.getQueriesData<PaginatedLeads>({ queryKey: LEADS_KEY })
      mapLeadPages(queryClient, (page) => ({
        ...page,
        data: page.data.map((lead) => (lead.id === id ? { ...lead, stage } : lead)),
      }))
      return { previous }
    },
    onError: (_err, _vars, context) => {
      context?.previous.forEach(([key, data]) => {
        queryClient.setQueryData(key, data)
      })
    },
    onSettled: () => {
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
    mutationFn: ({ address, reason }: { address: string; reason: string }) =>
      flagLeadByAddress(address, reason),
    onMutate: async ({ address, reason }) => {
      await queryClient.cancelQueries({ queryKey: LEADS_KEY })
      const previous = queryClient.getQueriesData<PaginatedLeads>({ queryKey: LEADS_KEY })
      mapLeadPages(queryClient, (page) => ({
        ...page,
        data: page.data.map((lead) =>
          lead.address === address
            ? { ...lead, distressFlag: true, distressReason: reason }
            : lead,
        ),
      }))
      return { previous }
    },
    onError: (_err, _vars, context) => {
      context?.previous.forEach(([key, data]) => {
        queryClient.setQueryData(key, data)
      })
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: LEADS_KEY })
    },
  })
}
