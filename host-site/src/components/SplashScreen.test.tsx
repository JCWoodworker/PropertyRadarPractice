import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { SplashScreen } from './SplashScreen'

describe('SplashScreen', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders an accessible loading status', () => {
    render(<SplashScreen onDone={() => {}} />)
    expect(screen.getByRole('status', { name: 'Loading RoofingFlow' })).toBeInTheDocument()
  })

  it('does not call onDone before 4 seconds have passed', () => {
    const onDone = vi.fn()
    render(<SplashScreen onDone={onDone} />)

    act(() => {
      vi.advanceTimersByTime(3999)
    })

    expect(onDone).not.toHaveBeenCalled()
  })

  it('calls onDone once the full sequence (at most ~4s) has elapsed', () => {
    const onDone = vi.fn()
    render(<SplashScreen onDone={onDone} />)

    act(() => {
      vi.advanceTimersByTime(4000)
    })

    expect(onDone).toHaveBeenCalledTimes(1)
  })

  it('starts fading out before onDone fires, not exactly at the same instant', () => {
    const onDone = vi.fn()
    const { container } = render(<SplashScreen onDone={onDone} />)
    const root = container.firstElementChild as HTMLElement

    act(() => {
      vi.advanceTimersByTime(3700)
    })

    expect(root.className).toContain('opacity-0')
    expect(onDone).not.toHaveBeenCalled()
  })
})
