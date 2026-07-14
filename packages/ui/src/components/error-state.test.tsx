import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ErrorState } from './error-state'

describe('ErrorState', () => {
  it('renders the message inside an alert', () => {
    render(<ErrorState message="Failed to load leads." />)
    expect(screen.getByRole('alert')).toHaveTextContent('Failed to load leads.')
  })

  it('does not render a retry button when onRetry is not provided', () => {
    render(<ErrorState message="Failed to load leads." />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('calls onRetry when the retry button is clicked', async () => {
    const onRetry = vi.fn()
    render(<ErrorState message="Failed to load leads." onRetry={onRetry} />)

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(onRetry).toHaveBeenCalledTimes(1)
  })
})
