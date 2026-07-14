import { useState } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { AddressAutocomplete } from './AddressAutocomplete'
import { createQueryWrapper } from '../test/query-client-wrapper'

/** `AddressAutocomplete` is fully controlled, so tests need a stateful host to type into. */
function ControlledHarness() {
  const [value, setValue] = useState('')
  return <AddressAutocomplete id="address" value={value} onChange={setValue} />
}

function renderHarness() {
  render(<ControlledHarness />, { wrapper: createQueryWrapper() })
}

describe('AddressAutocomplete', () => {
  it('does not show suggestions until at least 3 characters are typed', async () => {
    renderHarness()

    await userEvent.type(screen.getByRole('combobox'), '12')

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('shows fetched suggestions once the query is long enough, debounced', async () => {
    renderHarness()

    await userEvent.type(screen.getByRole('combobox'), '123 Main')

    await waitFor(() => expect(screen.getByRole('listbox')).toBeInTheDocument())
    expect(await screen.findByRole('option', { name: /123 Main Street, Springfield, IL/ })).toBeInTheDocument()
  })

  it('selecting a suggestion by click fills the input and closes the list', async () => {
    renderHarness()
    const input = screen.getByRole('combobox')

    await userEvent.type(input, '123 Main')
    const option = await screen.findByRole('option', { name: /123 Main Street, Springfield, IL/ })

    await userEvent.click(option)

    expect(input).toHaveValue('123 Main Street, Springfield, IL')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('supports selecting a suggestion via keyboard (ArrowDown + Enter)', async () => {
    renderHarness()
    const input = screen.getByRole('combobox')

    await userEvent.type(input, '123 Main')
    await screen.findByRole('option', { name: /123 Main Street, Springfield, IL/ })

    await userEvent.keyboard('{ArrowDown}{Enter}')

    expect(input).toHaveValue('123 Main Street, Springfield, IL')
  })

  it('closes the list on Escape', async () => {
    renderHarness()
    const input = screen.getByRole('combobox')

    await userEvent.type(input, '123 Main')
    await screen.findByRole('listbox')

    await userEvent.keyboard('{Escape}')

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })
})
