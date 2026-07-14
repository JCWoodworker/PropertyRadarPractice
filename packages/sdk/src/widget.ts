import { TypedEmitter, createRequestId } from './rpc'
import {
  JSONRPC_VERSION,
  isJsonRpcNotification,
  isJsonRpcResponse,
  type JsonRpcRequest,
  type RpcEventMap,
  type RpcMethodMap,
  type RpcMethodName,
} from './types'

export interface ParcelIQWidgetOptions {
  /** Element the iframe will be mounted into. */
  container: HTMLElement
  /** URL of the widget (iframe-app) dev server or deployed build. */
  src: string
  /**
   * Origin the widget is expected to run on. Messages from any other origin
   * are silently ignored. Defaults to the origin parsed from `src`.
   */
  allowedOrigin?: string
  /** Initial theme forwarded to the widget once it signals it's ready. */
  theme?: RpcMethodMap['setTheme']['params']
  /** iframe title, for accessibility. */
  title?: string
  /**
   * Fired for every raw JSON-RPC envelope sent to or received from the
   * widget, in both directions — the hook a host UI uses to build a live
   * traffic log (see host-site's `RpcEventLog`). Purely observational;
   * throwing here never affects the bridge itself.
   */
  onMessage?: (direction: 'outgoing' | 'incoming', message: unknown) => void
}

interface PendingCall {
  resolve: (value: unknown) => void
  reject: (reason: Error) => void
}

const READY_TIMEOUT_MS = 10_000
const CALL_TIMEOUT_MS = 10_000

/**
 * Public embed SDK: a host application (e.g. a CRM) creates one instance
 * per widget it wants to mount, in the same spirit as Stripe Elements or
 * Intercom's embed SDKs. Handles the iframe lifecycle, the ready handshake
 * (queuing calls made before the widget is listening), origin validation,
 * and exposes a small promise-based API over the JSON-RPC bridge.
 */
export class ParcelIQWidget {
  private readonly options: ParcelIQWidgetOptions
  private readonly allowedOrigin: string
  private iframe: HTMLIFrameElement | null = null
  private pending = new Map<string | number, PendingCall>()
  private emitter = new TypedEmitter<RpcEventMap>()
  private callQueue: Array<() => void> = []
  private ready = false
  private destroyed = false
  private readonly messageListener = (event: MessageEvent) => this.handleMessage(event)

  constructor(options: ParcelIQWidgetOptions) {
    this.options = options
    this.allowedOrigin = options.allowedOrigin ?? new URL(options.src).origin
  }

  /** Creates and appends the iframe, and starts listening for messages. Idempotent. */
  mount(): HTMLIFrameElement {
    if (this.iframe) return this.iframe

    const iframe = document.createElement('iframe')
    // Tell the widget which origin to trust as "the host" — it reads this
    // back out of its own `location.search` to validate incoming messages.
    const srcUrl = new URL(this.options.src)
    srcUrl.searchParams.set('parentOrigin', window.location.origin)
    iframe.src = srcUrl.toString()
    iframe.title = this.options.title ?? 'ParcelIQ property widget'
    iframe.style.border = '0'
    iframe.style.width = '100%'
    iframe.style.display = 'block'
    // Explicitly deny top navigation/downloads/pointer-lock from the embedded widget.
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups allow-forms')

    this.options.container.appendChild(iframe)
    this.iframe = iframe

    window.addEventListener('message', this.messageListener)

    const readyTimer = setTimeout(() => {
      if (!this.ready) {
        console.warn(
          `ParcelIQWidget: widget at "${this.options.src}" did not signal "ready" within ${READY_TIMEOUT_MS}ms`
        )
      }
    }, READY_TIMEOUT_MS)

    this.on('ready', () => {
      clearTimeout(readyTimer)
      this.ready = true
      if (this.options.theme) {
        void this.setTheme(this.options.theme)
      }
      this.flushQueue()
    })

    this.on('resize', ({ height }) => {
      iframe.style.height = `${height}px`
    })

    return iframe
  }

  /** Tears down the listener and iframe, rejecting any in-flight calls. */
  destroy(): void {
    if (this.destroyed) return
    this.destroyed = true
    window.removeEventListener('message', this.messageListener)
    this.pending.forEach((call) => call.reject(new Error('ParcelIQWidget destroyed')))
    this.pending.clear()
    this.callQueue = []
    this.emitter.clear()
    this.iframe?.remove()
    this.iframe = null
  }

  /** Subscribe to a widget-initiated notification (e.g. `propertyFlagged`). */
  on<K extends keyof RpcEventMap>(event: K, handler: (payload: RpcEventMap[K]) => void): () => void {
    return this.emitter.on(event, handler)
  }

  loadProperty(address: string): Promise<RpcMethodMap['loadProperty']['result']> {
    return this.call('loadProperty', { address })
  }

  setTheme(theme: RpcMethodMap['setTheme']['params']): Promise<RpcMethodMap['setTheme']['result']> {
    return this.call('setTheme', theme)
  }

  ping(): Promise<RpcMethodMap['ping']['result']> {
    return this.call('ping', undefined)
  }

  private call<M extends RpcMethodName>(
    method: M,
    params: RpcMethodMap[M]['params']
  ): Promise<RpcMethodMap[M]['result']> {
    if (this.destroyed) {
      return Promise.reject(new Error('ParcelIQWidget destroyed'))
    }

    if (!this.ready) {
      return new Promise((resolve, reject) => {
        this.callQueue.push(() => {
          this.call(method, params).then(resolve, reject)
        })
      })
    }

    return new Promise((resolve, reject) => {
      const id = createRequestId()
      const timeout = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error(`ParcelIQWidget: "${method}" timed out after ${CALL_TIMEOUT_MS}ms`))
      }, CALL_TIMEOUT_MS)

      this.pending.set(id, {
        resolve: (value) => {
          clearTimeout(timeout)
          resolve(value as RpcMethodMap[M]['result'])
        },
        reject: (err) => {
          clearTimeout(timeout)
          reject(err)
        },
      })

      const request: JsonRpcRequest<M> = { jsonrpc: JSONRPC_VERSION, id, method, params }
      this.postToWidget(request)
    })
  }

  private flushQueue(): void {
    const queued = this.callQueue
    this.callQueue = []
    queued.forEach((run) => run())
  }

  private postToWidget(message: unknown): void {
    this.options.onMessage?.('outgoing', message)
    this.iframe?.contentWindow?.postMessage(message, this.allowedOrigin)
  }

  private handleMessage(event: MessageEvent): void {
    if (event.origin !== this.allowedOrigin) return
    if (!this.iframe || event.source !== this.iframe.contentWindow) return

    const data: unknown = event.data
    this.options.onMessage?.('incoming', data)

    if (isJsonRpcResponse(data)) {
      const pendingCall = this.pending.get(data.id)
      if (!pendingCall) return
      this.pending.delete(data.id)
      if ('error' in data) {
        pendingCall.reject(new Error(data.error.message))
      } else {
        pendingCall.resolve(data.result)
      }
      return
    }

    if (isJsonRpcNotification(data)) {
      this.emitter.emit(data.method, data.params as RpcEventMap[typeof data.method])
    }
  }
}
