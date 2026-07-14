import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { StatBadge } from './stat-badge'

describe('StatBadge', () => {
  it('renders the label', () => {
    render(<StatBadge label="Distressed" />)
    expect(screen.getByText('Distressed')).toBeInTheDocument()
  })

  it('renders an icon when provided', () => {
    render(<StatBadge label="Distressed" icon={<svg data-testid="icon" />} />)
    expect(screen.getByTestId('icon')).toBeInTheDocument()
  })

  it('applies the destructive tone class', () => {
    render(<StatBadge label="Distressed" tone="destructive" />)
    expect(screen.getByText('Distressed').className).toContain('bg-destructive')
  })
})
