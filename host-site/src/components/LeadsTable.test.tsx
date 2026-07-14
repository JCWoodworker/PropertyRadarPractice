import type { ComponentProps } from 'react'
import { render, screen, within } from '@testing-library/react'
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

function renderTable(overrides: Partial<ComponentProps<typeof LeadsTable>> = {}) {
  return render(
    <LeadsTable
      leads={LEADS}
      isLoading={false}
      isEmpty={false}
      isError={false}
      error={null}
      onRetry={noop}
      onSelect={noop}
      onDelete={noop}
      onStageChange={noop}
      {...overrides}
    />
  )
}

describe('LeadsTable', () => {
  it('shows a loading state', () => {
    render(
      <LeadsTable
        leads={[]}
        isLoading
        isEmpty={false}
        isError={false}
        error={null}
        onRetry={noop}
        onSelect={noop}
        onDelete={noop}
        onStageChange={noop}
      />
    )
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('shows an empty state when there are no leads', () => {
    render(
      <LeadsTable
        leads={[]}
        isLoading={false}
        isEmpty
        isError={false}
        error={null}
        onRetry={noop}
        onSelect={noop}
        onDelete={noop}
        onStageChange={noop}
      />
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
        onStageChange={noop}
      />
    )
    expect(screen.getByText('Network down')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('renders a row per lead, its stage pill, and a distressed badge only for flagged leads', () => {
    renderTable()
    expect(screen.getByText('Dana Whitfield')).toBeInTheDocument()
    expect(screen.getByText('Marcus Ortiz')).toBeInTheDocument()
    expect(screen.getByText('Needs Estimate')).toBeInTheDocument()
    expect(screen.getByText('Scheduled')).toBeInTheDocument()
    expect(screen.getAllByText('Distressed')).toHaveLength(1)
    expect(screen.getAllByText('Normal')).toHaveLength(1)
  })

  it('calls onSelect with the clicked lead', async () => {
    const onSelect = vi.fn()
    renderTable({ onSelect })

    await userEvent.click(screen.getByText('Dana Whitfield'))

    expect(onSelect).toHaveBeenCalledWith(LEADS[0])
  })

  it('opens a stage menu without triggering onSelect, and calls onStageChange when an option is picked', async () => {
    const onSelect = vi.fn()
    const onStageChange = vi.fn()
    renderTable({ onSelect, onStageChange })

    await userEvent.click(screen.getByRole('button', { name: /change stage.*Needs Estimate/i }))
    expect(onSelect).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('menuitem', { name: 'Won' }))

    expect(onStageChange).toHaveBeenCalledWith('l1', 'Won')
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('opens a confirmation dialog instead of deleting immediately, and does not trigger onSelect', async () => {
    const onSelect = vi.fn()
    const onDelete = vi.fn()
    renderTable({ onSelect, onDelete })

    await userEvent.click(screen.getByRole('button', { name: 'Delete Dana Whitfield' }))

    expect(onDelete).not.toHaveBeenCalled()
    expect(onSelect).not.toHaveBeenCalled()
    const dialog = screen.getByRole('alertdialog')
    expect(within(dialog).getByText(/Dana Whitfield/)).toBeInTheDocument()
  })

  it('calls onDelete only after the confirmation dialog is confirmed', async () => {
    const onDelete = vi.fn()
    renderTable({ onDelete })

    await userEvent.click(screen.getByRole('button', { name: 'Delete Dana Whitfield' }))
    await userEvent.click(screen.getByRole('button', { name: 'Delete lead' }))

    expect(onDelete).toHaveBeenCalledWith('l1')
  })

  it('does not call onDelete when the confirmation dialog is cancelled', async () => {
    const onDelete = vi.fn()
    renderTable({ onDelete })

    await userEvent.click(screen.getByRole('button', { name: 'Delete Dana Whitfield' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onDelete).not.toHaveBeenCalled()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })
})
