import { useEffect, useRef, useState } from 'react'

import {
  buildNotify,
  dispatchRpcRequest,
  getExpectedParentOrigin,
  isTrustedParentMessage,
  type Notify,
  type RpcHandlers,
} from '../lib/rpc-bridge'

/**
 * Wires the widget up to the JSON-RPC bridge: validates every incoming
 * `message` against the host's origin, dispatches requests to the handlers
 * built by `createHandlers`, and sends a `ready` notification once
 * listening. `createHandlers` receives `notify` so handlers (like
 * `loadProperty`) can emit their own events (`propertyLoaded`) — and the
 * same `notify` is returned for proactive events like `resize` or
 * `propertyFlagged`.
 *
 * Handlers are re-built every render (so they always close over current
 * component state) but only synced into a ref from an effect — never
 * written to the ref during render — so the underlying `message` listener
 * can stay subscribed once while always reading the latest handlers.
 */
export function useRpcBridge(createHandlers: (notify: Notify) => RpcHandlers): Notify {
  const [notify] = useState<Notify>(() => {
    const parentOrigin = getExpectedParentOrigin()
    return buildNotify((message) => {
      if (!parentOrigin) return
      window.parent.postMessage(message, parentOrigin)
    })
  })

  const handlers = createHandlers(notify)
  const handlersRef = useRef<RpcHandlers>(handlers)
  useEffect(() => {
    handlersRef.current = handlers
  }, [handlers])

  useEffect(() => {
    const parentOrigin = getExpectedParentOrigin()

    function handleMessage(event: MessageEvent) {
      if (!isTrustedParentMessage(event, parentOrigin)) return
      void dispatchRpcRequest(event.data, handlersRef.current, (response) => {
        if (!parentOrigin) return
        window.parent.postMessage(response, parentOrigin)
      })
    }

    window.addEventListener('message', handleMessage)
    notify('ready', undefined)

    return () => window.removeEventListener('message', handleMessage)
    // `handlersRef` (kept fresh by the effect above) is how this listener
    // sees up-to-date handlers without resubscribing on every render —
    // `notify` is the only real dependency, and it's stable for the
    // component's lifetime.
  }, [notify])

  return notify
}
