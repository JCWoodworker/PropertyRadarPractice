/**
 * The JSON-RPC 2.0 contract shared between the host embed SDK
 * (`ParcelIQWidget`, used by a CRM) and the widget itself (iframe-app).
 *
 * Adding a new method or event means adding an entry to one of the two
 * maps below FIRST, then implementing the handler/emitter on each side.
 * See `packages/sdk/.cursor/rules/json-rpc-protocol.mdc` for the enforced
 * workflow and a worked example.
 */

export const JSONRPC_VERSION = '2.0' as const

export interface PropertyResult {
  address: string
  county: string | null
  state: string | null
  lat: number
  lon: number
  placeType: string
}

export interface ThemeOptions {
  mode: 'light' | 'dark'
  primaryColor?: string
}

/** Host -> widget calls. Every entry expects exactly one response. */
export interface RpcMethodMap {
  ping: {
    params: undefined
    result: { pong: true; timestamp: number }
  }
  loadProperty: {
    params: { address: string }
    result: PropertyResult
  }
  setTheme: {
    params: ThemeOptions
    result: { ok: true }
  }
}

/**
 * Widget -> host notifications. Fire-and-forget: no response is sent or
 * awaited for these, which is what makes `propertyFlagged` safe to fire
 * from a plain button click with no request/response round trip.
 */
export interface RpcEventMap {
  ready: undefined
  propertyLoaded: PropertyResult
  error: { message: string; code?: string }
  resize: { height: number }
  propertyFlagged: { address: string; reason: string }
}

export type RpcMethodName = keyof RpcMethodMap
export type RpcEventName = keyof RpcEventMap

export interface JsonRpcRequest<M extends RpcMethodName = RpcMethodName> {
  jsonrpc: typeof JSONRPC_VERSION
  id: string | number
  method: M
  params: RpcMethodMap[M]['params']
}

export interface JsonRpcSuccess<M extends RpcMethodName = RpcMethodName> {
  jsonrpc: typeof JSONRPC_VERSION
  id: string | number
  result: RpcMethodMap[M]['result']
}

export interface JsonRpcErrorResponse {
  jsonrpc: typeof JSONRPC_VERSION
  id: string | number
  error: { code: number; message: string }
}

export type JsonRpcResponse<M extends RpcMethodName = RpcMethodName> =
  | JsonRpcSuccess<M>
  | JsonRpcErrorResponse

export interface JsonRpcNotification<E extends RpcEventName = RpcEventName> {
  jsonrpc: typeof JSONRPC_VERSION
  method: E
  params: RpcEventMap[E]
}

export type JsonRpcMessage = JsonRpcRequest | JsonRpcResponse | JsonRpcNotification

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/** A request always has both `id` and `method`, never `result`/`error`. */
export function isJsonRpcRequest(message: unknown): message is JsonRpcRequest {
  return (
    isRecord(message) &&
    message.jsonrpc === JSONRPC_VERSION &&
    typeof message.method === 'string' &&
    'id' in message
  )
}

/** A response always has `id` plus exactly one of `result`/`error`, never `method`. */
export function isJsonRpcResponse(message: unknown): message is JsonRpcResponse {
  return (
    isRecord(message) &&
    message.jsonrpc === JSONRPC_VERSION &&
    'id' in message &&
    !('method' in message) &&
    ('result' in message || 'error' in message)
  )
}

/** A notification has `method` but no `id` — no response is expected. */
export function isJsonRpcNotification(message: unknown): message is JsonRpcNotification {
  return (
    isRecord(message) &&
    message.jsonrpc === JSONRPC_VERSION &&
    typeof message.method === 'string' &&
    !('id' in message)
  )
}
