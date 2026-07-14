import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { EventLogDrawer } from './EventLogDrawer'
import type { RpcLogEntry } from './ParcelIQEmbed'

const ENTRIES: RpcLogEntry[] = [
  { id: '1', direction: 'outgoing', message: { jsonrpc: '2.0', id: 1, method: 'loadProperty' }, timestamp: Date.now() },
]

describe('EventLogDrawer', () => {
  it('always shows the toggle tab with the exact label', () => {
    render(<EventLogDrawer entries={[]} />)
    expect(screen.getByRole('button', { name: /Show Live JSON-RPC Event Log/ })).toBeInTheDocument()
  })

  it('starts collapsed (aria-expanded false)', () => {
    render(<EventLogDrawer entries={[]} />)
    expect(screen.getByRole('button', { name: /Show Live JSON-RPC Event Log/ })).toHaveAttribute('aria-expanded', 'false')
  })

  it('toggles aria-expanded when clicked, and stays clickable (label does not change)', async () => {
    render(<EventLogDrawer entries={[]} />)
    const toggle = screen.getByRole('button', { name: /Show Live JSON-RPC Event Log/ })

    await userEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')

    await userEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
  })

  it('renders the event log entries', () => {
    render(<EventLogDrawer entries={ENTRIES} />)
    expect(screen.getByText(/loadProperty/)).toBeInTheDocument()
  })

  it('shows an empty state when there are no entries', () => {
    render(<EventLogDrawer entries={[]} />)
    expect(screen.getByText('No traffic yet')).toBeInTheDocument()
  })
})
