import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { EmptyState } from './empty-state'

describe('EmptyState', () => {
  it('renders the title', () => {
    render(<EmptyState title="No leads yet" />)
    expect(screen.getByText('No leads yet')).toBeInTheDocument()
  })

  it('renders the description when provided', () => {
    render(<EmptyState title="No leads yet" description="Add your first lead to get started." />)
    expect(screen.getByText('Add your first lead to get started.')).toBeInTheDocument()
  })

  it('omits the description when not provided', () => {
    render(<EmptyState title="No leads yet" />)
    expect(screen.queryByText(/get started/)).not.toBeInTheDocument()
  })

  it('renders the action when provided', () => {
    render(<EmptyState title="No leads yet" action={<button>Add lead</button>} />)
    expect(screen.getByRole('button', { name: 'Add lead' })).toBeInTheDocument()
  })
})
