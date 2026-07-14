import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { StagePill } from './StagePill'

describe('StagePill', () => {
  it('renders the current stage as the visible label', () => {
    render(<StagePill stage="Scheduled" onChange={() => {}} />)
    expect(screen.getByText('Scheduled')).toBeInTheDocument()
  })

  it('lists every stage option when opened, with the current one checked', async () => {
    render(<StagePill stage="Quoted" onChange={() => {}} />)

    await userEvent.click(screen.getByRole('button'))

    const options = ['Needs Estimate', 'Scheduled', 'Quoted', 'Won', 'Lost']
    for (const option of options) {
      expect(screen.getByRole('menuitem', { name: option })).toBeInTheDocument()
    }
  })

  it('calls onChange with the selected stage', async () => {
    const onChange = vi.fn()
    render(<StagePill stage="Needs Estimate" onChange={onChange} />)

    await userEvent.click(screen.getByRole('button'))
    await userEvent.click(screen.getByRole('menuitem', { name: 'Won' }))

    expect(onChange).toHaveBeenCalledWith('Won')
  })
})
