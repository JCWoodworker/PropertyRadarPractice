import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ConfirmDialog } from './confirm-dialog'

describe('ConfirmDialog', () => {
  it('renders nothing interactive when closed', () => {
    render(<ConfirmDialog open={false} onOpenChange={() => {}} title="Delete this lead?" onConfirm={() => {}} />)
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('renders the title and description when open', () => {
    render(
      <ConfirmDialog
        open
        onOpenChange={() => {}}
        title="Delete this lead?"
        description="This can't be undone."
        onConfirm={() => {}}
      />
    )
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    expect(screen.getByText('Delete this lead?')).toBeInTheDocument()
    expect(screen.getByText("This can't be undone.")).toBeInTheDocument()
  })

  it('calls onConfirm when the confirm button is clicked', async () => {
    const onConfirm = vi.fn()
    render(<ConfirmDialog open onOpenChange={() => {}} title="Delete this lead?" confirmLabel="Delete lead" onConfirm={onConfirm} />)

    await userEvent.click(screen.getByRole('button', { name: 'Delete lead' }))

    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('calls onOpenChange(false) without calling onConfirm when cancelled', async () => {
    const onConfirm = vi.fn()
    const onOpenChange = vi.fn()
    render(<ConfirmDialog open onOpenChange={onOpenChange} title="Delete this lead?" onConfirm={onConfirm} />)

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onConfirm).not.toHaveBeenCalled()
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('disables both buttons while isConfirming is true', () => {
    render(<ConfirmDialog open onOpenChange={() => {}} title="Delete this lead?" onConfirm={() => {}} isConfirming />)

    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Working…' })).toBeDisabled()
  })
})
