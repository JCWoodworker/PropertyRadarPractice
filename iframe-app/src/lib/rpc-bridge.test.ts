import { describe, expect, it, vi } from 'vitest'

import { dispatchRpcRequest, getExpectedParentOrigin, isTrustedParentMessage, type RpcHandlers } from './rpc-bridge'
import { JSONRPC_VERSION } from '@parceliq/embed-sdk'

describe('getExpectedParentOrigin', () => {
  it('reads the parentOrigin query param', () => {
    expect(getExpectedParentOrigin('?parentOrigin=http%3A%2F%2Flocalhost%3A5173')).toBe('http://localhost:5173')
  })

  it('returns null when the param is missing', () => {
    expect(getExpectedParentOrigin('')).toBeNull()
  })
})

describe('isTrustedParentMessage', () => {
  it('rejects when there is no expected origin at all', () => {
    const event = { origin: 'http://localhost:5173', source: window.parent } as MessageEvent
    expect(isTrustedParentMessage(event, null)).toBe(false)
  })

  it('rejects a mismatched origin', () => {
    const event = { origin: 'https://evil.example.com', source: window.parent } as MessageEvent
    expect(isTrustedParentMessage(event, 'http://localhost:5173')).toBe(false)
  })

  it('rejects a message whose source is not window.parent', () => {
    const event = { origin: 'http://localhost:5173', source: {} } as unknown as MessageEvent
    expect(isTrustedParentMessage(event, 'http://localhost:5173')).toBe(false)
  })

  it('accepts a matching origin and source', () => {
    const event = { origin: 'http://localhost:5173', source: window.parent } as MessageEvent
    expect(isTrustedParentMessage(event, 'http://localhost:5173')).toBe(true)
  })
})

describe('dispatchRpcRequest', () => {
  const handlers: RpcHandlers = {
    ping: () => ({ pong: true, timestamp: 1 }),
    loadProperty: async ({ address }) => ({
      address,
      county: null,
      state: null,
      lat: 0,
      lon: 0,
      placeType: 'house',
    }),
    setTheme: () => ({ ok: true }),
  }

  it('ignores non-request messages', async () => {
    const respond = vi.fn()
    await dispatchRpcRequest({ jsonrpc: JSONRPC_VERSION, method: 'ready' }, handlers, respond)
    expect(respond).not.toHaveBeenCalled()
  })

  it('routes a request to the matching handler and responds with its result', async () => {
    const respond = vi.fn()
    await dispatchRpcRequest({ jsonrpc: JSONRPC_VERSION, id: 1, method: 'ping', params: undefined }, handlers, respond)

    expect(respond).toHaveBeenCalledWith({ jsonrpc: JSONRPC_VERSION, id: 1, result: { pong: true, timestamp: 1 } })
  })

  it('awaits an async handler before responding', async () => {
    const respond = vi.fn()
    await dispatchRpcRequest(
      { jsonrpc: JSONRPC_VERSION, id: 2, method: 'loadProperty', params: { address: '123 Main St' } },
      handlers,
      respond
    )

    expect(respond).toHaveBeenCalledWith(
      expect.objectContaining({ id: 2, result: expect.objectContaining({ address: '123 Main St' }) })
    )
  })

  it('responds with a "method not found" error for an unknown method', async () => {
    const respond = vi.fn()
    await dispatchRpcRequest(
      { jsonrpc: JSONRPC_VERSION, id: 3, method: 'doesNotExist', params: undefined },
      handlers,
      respond
    )

    expect(respond).toHaveBeenCalledWith({
      jsonrpc: JSONRPC_VERSION,
      id: 3,
      error: { code: -32601, message: 'Unknown method "doesNotExist"' },
    })
  })

  it('responds with an error when the handler throws', async () => {
    const throwingHandlers: RpcHandlers = {
      ...handlers,
      ping: () => {
        throw new Error('boom')
      },
    }
    const respond = vi.fn()
    await dispatchRpcRequest({ jsonrpc: JSONRPC_VERSION, id: 4, method: 'ping', params: undefined }, throwingHandlers, respond)

    expect(respond).toHaveBeenCalledWith({ jsonrpc: JSONRPC_VERSION, id: 4, error: { code: -32000, message: 'boom' } })
  })
})
