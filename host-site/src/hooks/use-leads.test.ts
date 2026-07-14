import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { __resetLeadsForTests } from '../lib/leads-store'
import { createQueryWrapper, createTestQueryClient } from '../test/query-client-wrapper'
import { useAddLead, useDeleteLead, useFlagLead, useLeads, useUpdateLeadStage } from './use-leads'

describe('useLeads + useAddLead + useDeleteLead + useFlagLead + useUpdateLeadStage', () => {
  beforeEach(() => {
    __resetLeadsForTests()
  })

  it('loads the seeded leads', async () => {
    const { result } = renderHook(() => useLeads(), { wrapper: createQueryWrapper() })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.isEmpty).toBe(false)
    expect(result.current.leads.length).toBeGreaterThan(0)
    expect(result.current.leads.every((lead) => !lead.distressFlag)).toBe(true)
  })

  it('adding a lead invalidates the list so the new lead appears', async () => {
    const queryClient = createTestQueryClient()
    const wrapper = createQueryWrapper(queryClient)

    const { result: listResult } = renderHook(() => useLeads(), { wrapper })
    const { result: addResult } = renderHook(() => useAddLead(), { wrapper })
    await waitFor(() => expect(listResult.current.isLoading).toBe(false))
    const initialCount = listResult.current.leads.length

    addResult.current.mutate({
      name: 'Test Lead',
      company: 'Test Co',
      address: '1 Test Way',
      stage: 'Needs Estimate',
      roofAgeYears: 10,
      roofMaterial: 'Metal',
      lastInspection: '2026-01-01',
    })

    await waitFor(() => expect(listResult.current.leads.length).toBe(initialCount + 1))
    expect(listResult.current.leads[0]).toMatchObject({ name: 'Test Lead', distressFlag: false })
  })

  it('deleting a lead invalidates the list so it disappears', async () => {
    const queryClient = createTestQueryClient()
    const wrapper = createQueryWrapper(queryClient)

    const { result: listResult } = renderHook(() => useLeads(), { wrapper })
    const { result: deleteResult } = renderHook(() => useDeleteLead(), { wrapper })
    await waitFor(() => expect(listResult.current.isLoading).toBe(false))
    const [firstLead] = listResult.current.leads

    deleteResult.current.mutate(firstLead.id)

    await waitFor(() => expect(listResult.current.leads.some((lead) => lead.id === firstLead.id)).toBe(false))
  })

  it('flagging a lead by address marks it distressed — the host-side half of propertyFlagged', async () => {
    const queryClient = createTestQueryClient()
    const wrapper = createQueryWrapper(queryClient)

    const { result: listResult } = renderHook(() => useLeads(), { wrapper })
    const { result: flagResult } = renderHook(() => useFlagLead(), { wrapper })
    await waitFor(() => expect(listResult.current.isLoading).toBe(false))
    const [target] = listResult.current.leads

    flagResult.current.mutate({ address: target.address, reason: 'Visible roof damage' })

    await waitFor(() => {
      const updated = listResult.current.leads.find((lead) => lead.id === target.id)
      expect(updated?.distressFlag).toBe(true)
    })
    const updated = listResult.current.leads.find((lead) => lead.id === target.id)
    expect(updated?.distressReason).toBe('Visible roof damage')
  })

  it('updating a lead stage invalidates the list so the new stage is reflected', async () => {
    const queryClient = createTestQueryClient()
    const wrapper = createQueryWrapper(queryClient)

    const { result: listResult } = renderHook(() => useLeads(), { wrapper })
    const { result: stageResult } = renderHook(() => useUpdateLeadStage(), { wrapper })
    await waitFor(() => expect(listResult.current.isLoading).toBe(false))
    const [target] = listResult.current.leads

    stageResult.current.mutate({ id: target.id, stage: 'Won' })

    await waitFor(() => {
      const updated = listResult.current.leads.find((lead) => lead.id === target.id)
      expect(updated?.stage).toBe('Won')
    })
  })
})
