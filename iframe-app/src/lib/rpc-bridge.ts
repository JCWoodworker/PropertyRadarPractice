import {
  JSONRPC_VERSION,
  buildNotification,
  isJsonRpcRequest,
  type JsonRpcResponse,
  type RpcEventMap,
  type RpcEventName,
  type RpcMethodMap,
  type RpcMethodName,
} from '@parceliq/embed-sdk'

export type RpcHandler<M extends RpcMethodName> = (
  params: RpcMethodMap[M]['params']
) => RpcMethodMap[M]['result'] | Promise<RpcMethodMap[M]['result']>

export type RpcHandlers = { [M in RpcMethodName]: RpcHandler<M> }

export type Notify = <E extends RpcEventName>(event: E, params: RpcEventMap[E]) => void

/**
 * Reads the host's origin from the `parentOrigin` query param the SDK
 * appends when it constructs the iframe's `src` (see
 * `ParcelIQWidget.mount()` in packages/sdk). This is the widget's half of
 * the origin-check contract documented in
 * `.cursor/rules/json-rpc-protocol.mdc` — never trust a message without
 * checking it against this value first.
 */
export function getExpectedParentOrigin(search: string = window.location.search): string | null {
  return new URLSearchParams(search).get('parentOrigin')
}

/** True only for a `message` event that both matches the expected host origin and truly comes from the parent frame. */
export function isTrustedParentMessage(event: MessageEvent, expectedOrigin: string | null): boolean {
  if (!expectedOrigin) return false
  if (event.origin !== expectedOrigin) return false
  if (event.source !== window.parent) return false
  return true
}

/**
 * Given a raw incoming message, routes it to the matching handler and
 * reports the result back through `respond`. Deliberately framework-free
 * so it can be unit tested with plain mock objects.
 */
export async function dispatchRpcRequest(
  data: unknown,
  handlers: RpcHandlers,
  respond: (response: JsonRpcResponse) => void
): Promise<void> {
  if (!isJsonRpcRequest(data)) return

  const handler = handlers[data.method]
  if (!handler) {
    respond({
      jsonrpc: JSONRPC_VERSION,
      id: data.id,
      error: { code: -32601, message: `Unknown method "${data.method}"` },
    })
    return
  }

  try {
    const result = await handler(data.params as never)
    respond({ jsonrpc: JSONRPC_VERSION, id: data.id, result } as JsonRpcResponse)
  } catch (err) {
    respond({
      jsonrpc: JSONRPC_VERSION,
      id: data.id,
      error: { code: -32000, message: err instanceof Error ? err.message : 'Unknown error' },
    })
  }
}

export function buildNotify(postToParent: (message: unknown) => void): Notify {
  return (event, params) => postToParent(buildNotification(event, params))
}
