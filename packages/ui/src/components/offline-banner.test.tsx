import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { OfflineBanner } from './offline-banner'

describe('OfflineBanner', () => {
  it('renders a default message', () => {
    render(<OfflineBanner />)
    expect(screen.getByText(/last cached result/)).toBeInTheDocument()
  })

  it('renders a custom message when provided', () => {
    render(<OfflineBanner message="Custom offline message" />)
    expect(screen.getByText('Custom offline message')).toBeInTheDocument()
  })
})
