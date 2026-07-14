import { describe, expect, it, vi } from 'vitest'

import { buildNotification, createRequestId, TypedEmitter } from './rpc'
import { JSONRPC_VERSION } from './types'

describe('createRequestId', () => {
  it('never returns the same id twice in a row', () => {
    const ids = new Set(Array.from({ length: 20 }, () => createRequestId()))
    expect(ids.size).toBe(20)
  })
})

describe('buildNotification', () => {
  it('builds a JSON-RPC 2.0 envelope with no id', () => {
    const notification = buildNotification('propertyFlagged', { address: '123 Main St', reason: 'roof damage' })
    expect(notification).toEqual({
      jsonrpc: JSONRPC_VERSION,
      method: 'propertyFlagged',
      params: { address: '123 Main St', reason: 'roof damage' },
    })
    expect(notification).not.toHaveProperty('id')
  })
})

describe('TypedEmitter', () => {
  it('calls a registered handler with the emitted payload', () => {
    const emitter = new TypedEmitter<{ ready: undefined; propertyFlagged: { address: string } }>()
    const handler = vi.fn()

    emitter.on('propertyFlagged', handler)
    emitter.emit('propertyFlagged', { address: '123 Main St' })

    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith({ address: '123 Main St' })
  })

  it('supports multiple listeners for the same event', () => {
    const emitter = new TypedEmitter<{ ready: undefined }>()
    const first = vi.fn()
    const second = vi.fn()

    emitter.on('ready', first)
    emitter.on('ready', second)
    emitter.emit('ready', undefined)

    expect(first).toHaveBeenCalledTimes(1)
    expect(second).toHaveBeenCalledTimes(1)
  })

  it('stops calling a handler after its unsubscribe function is called', () => {
    const emitter = new TypedEmitter<{ ready: undefined }>()
    const handler = vi.fn()

    const unsubscribe = emitter.on('ready', handler)
    unsubscribe()
    emitter.emit('ready', undefined)

    expect(handler).not.toHaveBeenCalled()
  })

  it('clear() removes every listener for every event', () => {
    const emitter = new TypedEmitter<{ ready: undefined }>()
    const handler = vi.fn()

    emitter.on('ready', handler)
    emitter.clear()
    emitter.emit('ready', undefined)

    expect(handler).not.toHaveBeenCalled()
  })
})
