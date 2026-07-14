import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { LeadsTable } from './LeadsTable'
import type { Lead } from '../lib/leads-store'

const LEADS: Lead[] = [
  {
    id: 'l1',
    name: 'Dana Whitfield',
    company: 'Whitfield Family Home',
    address: '1600 Pennsylvania Avenue NW, Washington, DC',
    stage: 'Needs Estimate',
    roofAgeYears: 22,
    roofMaterial: 'Asphalt Shingle',
    lastInspection: '2025-02-18',
    distressFlag: false,
    distressReason: null,
  },
  {
    id: 'l2',
    name: 'Marcus Ortiz',
    company: 'Ortiz Rental Properties',
    address: '350 Fifth Avenue, New York, NY',
    stage: 'Scheduled',
    roofAgeYears: 8,
    roofMaterial: 'Membrane (TPO)',
    lastInspection: '2025-11-03',
    distressFlag: true,
    distressReason: 'Visible roof damage',
  },
]

const noop = () => {}

describe('LeadsTable', () => {
  it('shows a loading state', () => {
    render(
      <LeadsTable leads={[]} isLoading isEmpty={false} isError={false} error={null} onRetry={noop} onSelect={noop} onDelete={noop} />
    )
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('shows an empty state when there are no leads', () => {
    render(
      <LeadsTable leads={[]} isLoading={false} isEmpty isError={false} error={null} onRetry={noop} onSelect={noop} onDelete={noop} />
    )
    expect(screen.getByText('No leads yet')).toBeInTheDocument()
  })

  it('shows an error state with a retry action', async () => {
    const onRetry = vi.fn()
    render(
      <LeadsTable
        leads={[]}
        isLoading={false}
        isEmpty={false}
        isError
        error={new Error('Network down')}
        onRetry={onRetry}
        onSelect={noop}
        onDelete={noop}
      />
    )
    expect(screen.getByText('Network down')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('renders a row per lead and a distressed badge only for flagged leads', () => {
    render(
      <LeadsTable leads={LEADS} isLoading={false} isEmpty={false} isError={false} error={null} onRetry={noop} onSelect={noop} onDelete={noop} />
    )
    expect(screen.getByText('Dana Whitfield')).toBeInTheDocument()
    expect(screen.getByText('Marcus Ortiz')).toBeInTheDocument()
    expect(screen.getAllByText('Distressed')).toHaveLength(1)
    expect(screen.getAllByText('Normal')).toHaveLength(1)
  })

  it('calls onSelect with the clicked lead', async () => {
    const onSelect = vi.fn()
    render(
      <LeadsTable leads={LEADS} isLoading={false} isEmpty={false} isError={false} error={null} onRetry={noop} onSelect={onSelect} onDelete={noop} />
    )

    await userEvent.click(screen.getByText('Dana Whitfield'))

    expect(onSelect).toHaveBeenCalledWith(LEADS[0])
  })

  it('calls onDelete without triggering onSelect when the delete button is clicked', async () => {
    const onSelect = vi.fn()
    const onDelete = vi.fn()
    render(
      <LeadsTable leads={LEADS} isLoading={false} isEmpty={false} isError={false} error={null} onRetry={noop} onSelect={onSelect} onDelete={onDelete} />
    )

    await userEvent.click(screen.getByRole('button', { name: 'Delete Dana Whitfield' }))

    expect(onDelete).toHaveBeenCalledWith('l1')
    expect(onSelect).not.toHaveBeenCalled()
  })
})
