import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { LoadingState } from './loading-state'

describe('LoadingState', () => {
  it('renders a status role with the label as accessible text', () => {
    render(<LoadingState label="Loading leads…" />)
    expect(screen.getByRole('status')).toHaveTextContent('Loading leads…')
  })

  it('renders the requested number of skeleton lines', () => {
    const { container } = render(<LoadingState lines={5} />)
    expect(container.querySelectorAll('.animate-pulse')).toHaveLength(5)
  })

  it('defaults to 3 lines', () => {
    const { container } = render(<LoadingState />)
    expect(container.querySelectorAll('.animate-pulse')).toHaveLength(3)
  })
})
