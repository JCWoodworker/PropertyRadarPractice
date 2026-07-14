import { JSONRPC_VERSION, type RpcEventMap, type RpcEventName, type JsonRpcNotification } from './types'

let counter = 0

/** Monotonic, collision-resistant id for correlating a request with its response. */
export function createRequestId(): string {
  counter += 1
  return `parceliq-${Date.now()}-${counter}`
}

export function buildNotification<E extends RpcEventName>(
  method: E,
  params: RpcEventMap[E]
): JsonRpcNotification<E> {
  return { jsonrpc: JSONRPC_VERSION, method, params }
}

/**
 * Minimal typed event emitter used by both sides of the bridge to expose
 * `.on(event, handler)` for JSON-RPC notifications. Deliberately dependency-free.
 */
export class TypedEmitter<EventMap extends object> {
  private listeners = new Map<keyof EventMap, Set<(payload: never) => void>>()

  on<K extends keyof EventMap>(event: K, handler: (payload: EventMap[K]) => void): () => void {
    const set = this.listeners.get(event) ?? new Set()
    set.add(handler as (payload: never) => void)
    this.listeners.set(event, set)
    return () => this.off(event, handler)
  }

  off<K extends keyof EventMap>(event: K, handler: (payload: EventMap[K]) => void): void {
    this.listeners.get(event)?.delete(handler as (payload: never) => void)
  }

  emit<K extends keyof EventMap>(event: K, payload: EventMap[K]): void {
    this.listeners.get(event)?.forEach((handler) => (handler as (payload: EventMap[K]) => void)(payload))
  }

  listenerCount(event: keyof EventMap): number {
    return this.listeners.get(event)?.size ?? 0
  }

  clear(): void {
    this.listeners.clear()
  }
}
