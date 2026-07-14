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
  render(
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
  // Both the desktop table and the mobile card list render at once (CSS
  // toggles which is visible; jsdom doesn't evaluate media queries), so
  // every query below is scoped to one or the other rather than the whole
  // document to avoid ambiguous "found multiple elements" matches.
  return {
    table: screen.getByRole('table'),
    cards: screen.getByTestId('lead-cards'),
  }
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

  describe('desktop table (sm and up)', () => {
    it('renders a row per lead, its stage pill, and a distressed badge only for flagged leads', () => {
      const { table } = renderTable()
      expect(within(table).getByText('Dana Whitfield')).toBeInTheDocument()
      expect(within(table).getByText('Marcus Ortiz')).toBeInTheDocument()
      expect(within(table).getByText('Needs Estimate')).toBeInTheDocument()
      expect(within(table).getByText('Scheduled')).toBeInTheDocument()
      expect(within(table).getAllByText('Distressed')).toHaveLength(1)
      expect(within(table).getAllByText('Normal')).toHaveLength(1)
    })

    it('calls onSelect with the clicked lead', async () => {
      const onSelect = vi.fn()
      const { table } = renderTable({ onSelect })

      await userEvent.click(within(table).getByText('Dana Whitfield'))

      expect(onSelect).toHaveBeenCalledWith(LEADS[0])
    })

    it('opens a stage menu without triggering onSelect, and calls onStageChange when an option is picked', async () => {
      const onSelect = vi.fn()
      const onStageChange = vi.fn()
      const { table } = renderTable({ onSelect, onStageChange })

      await userEvent.click(within(table).getByRole('button', { name: /change stage.*Needs Estimate/i }))
      expect(onSelect).not.toHaveBeenCalled()

      await userEvent.click(screen.getByRole('menuitem', { name: 'Won' }))

      expect(onStageChange).toHaveBeenCalledWith('l1', 'Won')
      expect(onSelect).not.toHaveBeenCalled()
    })

    it('opens a confirmation dialog instead of deleting immediately, and does not trigger onSelect', async () => {
      const onSelect = vi.fn()
      const onDelete = vi.fn()
      const { table } = renderTable({ onSelect, onDelete })

      await userEvent.click(within(table).getByRole('button', { name: 'Delete Dana Whitfield' }))

      expect(onDelete).not.toHaveBeenCalled()
      expect(onSelect).not.toHaveBeenCalled()
      const dialog = screen.getByRole('alertdialog')
      expect(within(dialog).getByText(/Dana Whitfield/)).toBeInTheDocument()
    })

    it('calls onDelete only after the confirmation dialog is confirmed', async () => {
      const onDelete = vi.fn()
      const { table } = renderTable({ onDelete })

      await userEvent.click(within(table).getByRole('button', { name: 'Delete Dana Whitfield' }))
      await userEvent.click(screen.getByRole('button', { name: 'Delete lead' }))

      expect(onDelete).toHaveBeenCalledWith('l1')
    })

    it('does not call onDelete when the confirmation dialog is cancelled', async () => {
      const onDelete = vi.fn()
      const { table } = renderTable({ onDelete })

      await userEvent.click(within(table).getByRole('button', { name: 'Delete Dana Whitfield' }))
      await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

      expect(onDelete).not.toHaveBeenCalled()
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    })
  })

  describe('mobile card list (below sm)', () => {
    it('renders a card per lead with name, address, stage, and status', () => {
      const { cards } = renderTable()
      expect(within(cards).getByText('Dana Whitfield')).toBeInTheDocument()
      expect(within(cards).getByText('350 Fifth Avenue, New York, NY')).toBeInTheDocument()
      expect(within(cards).getAllByText('Distressed')).toHaveLength(1)
    })

    it('calls onSelect when a card is tapped', async () => {
      const onSelect = vi.fn()
      const { cards } = renderTable({ onSelect })

      await userEvent.click(within(cards).getByText('Marcus Ortiz'))

      expect(onSelect).toHaveBeenCalledWith(LEADS[1])
    })

    it('opens the same confirmation dialog when a card delete button is tapped', async () => {
      const onDelete = vi.fn()
      const { cards } = renderTable({ onDelete })

      await userEvent.click(within(cards).getByRole('button', { name: 'Delete Marcus Ortiz' }))
      expect(screen.getByRole('alertdialog')).toBeInTheDocument()

      await userEvent.click(screen.getByRole('button', { name: 'Delete lead' }))
      expect(onDelete).toHaveBeenCalledWith('l2')
    })
  })
})
