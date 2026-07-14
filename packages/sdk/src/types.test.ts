import { describe, expect, it } from 'vitest'

import { isJsonRpcNotification, isJsonRpcRequest, isJsonRpcResponse } from './types'

describe('isJsonRpcRequest', () => {
  it('accepts a message with method and id', () => {
    expect(isJsonRpcRequest({ jsonrpc: '2.0', id: 1, method: 'ping', params: undefined })).toBe(true)
  })

  it('rejects a message missing id', () => {
    expect(isJsonRpcRequest({ jsonrpc: '2.0', method: 'ping', params: undefined })).toBe(false)
  })

  it('rejects non-JSON-RPC-2.0 messages', () => {
    expect(isJsonRpcRequest({ id: 1, method: 'ping' })).toBe(false)
  })

  it('rejects non-objects', () => {
    expect(isJsonRpcRequest('not an object')).toBe(false)
    expect(isJsonRpcRequest(null)).toBe(false)
  })
})

describe('isJsonRpcResponse', () => {
  it('accepts a success response', () => {
    expect(isJsonRpcResponse({ jsonrpc: '2.0', id: 1, result: { ok: true } })).toBe(true)
  })

  it('accepts an error response', () => {
    expect(isJsonRpcResponse({ jsonrpc: '2.0', id: 1, error: { code: -32000, message: 'boom' } })).toBe(true)
  })

  it('rejects a message that also has a method (that would be a request, not a response)', () => {
    expect(isJsonRpcResponse({ jsonrpc: '2.0', id: 1, method: 'ping', result: {} })).toBe(false)
  })

  it('rejects a message with neither result nor error', () => {
    expect(isJsonRpcResponse({ jsonrpc: '2.0', id: 1 })).toBe(false)
  })
})

describe('isJsonRpcNotification', () => {
  it('accepts a message with method but no id', () => {
    expect(isJsonRpcNotification({ jsonrpc: '2.0', method: 'ready', params: undefined })).toBe(true)
  })

  it('rejects a message that has an id (that would be a request)', () => {
    expect(isJsonRpcNotification({ jsonrpc: '2.0', id: 1, method: 'ready' })).toBe(false)
  })
})
