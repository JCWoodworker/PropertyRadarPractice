import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { JSONRPC_VERSION } from './types'
import { ParcelIQWidget } from './widget'

/** Reaches into the widget's private iframe field — acceptable in tests, never in app code. */
function getIframeWindow(widget: ParcelIQWidget): Window {
  const iframe = (widget as unknown as { iframe: HTMLIFrameElement | null }).iframe
  if (!iframe?.contentWindow) throw new Error('iframe not mounted')
  return iframe.contentWindow
}

function dispatchFromWidget(widget: ParcelIQWidget, data: unknown, origin = 'http://localhost:5174') {
  const source = getIframeWindow(widget)
  window.dispatchEvent(new MessageEvent('message', { data, origin, source }))
}

describe('ParcelIQWidget', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    container.remove()
  })

  it('mount() appends an iframe with the parentOrigin query param set', () => {
    const widget = new ParcelIQWidget({ container, src: 'http://localhost:5174/' })
    const iframe = widget.mount()

    expect(iframe.tagName).toBe('IFRAME')
    expect(new URL(iframe.src).searchParams.get('parentOrigin')).toBe(window.location.origin)
    expect(container.contains(iframe)).toBe(true)
  })

  it('mount() is idempotent', () => {
    const widget = new ParcelIQWidget({ container, src: 'http://localhost:5174/' })
    const first = widget.mount()
    const second = widget.mount()
    expect(first).toBe(second)
    expect(container.children).toHaveLength(1)
  })

  it('queues calls made before "ready" and flushes them once it fires', async () => {
    const widget = new ParcelIQWidget({ container, src: 'http://localhost:5174/' })
    widget.mount()
    const postSpy = vi.spyOn(getIframeWindow(widget), 'postMessage')

    const promise = widget.ping()
    expect(postSpy).not.toHaveBeenCalled()

    dispatchFromWidget(widget, { jsonrpc: JSONRPC_VERSION, method: 'ready' })
    expect(postSpy).toHaveBeenCalledTimes(1)

    const [sentMessage] = postSpy.mock.calls[0] as [{ id: string | number }]
    dispatchFromWidget(widget, { jsonrpc: JSONRPC_VERSION, id: sentMessage.id, result: { pong: true, timestamp: 123 } })

    await expect(promise).resolves.toEqual({ pong: true, timestamp: 123 })
  })

  it('applies the initial theme automatically once ready', () => {
    const widget = new ParcelIQWidget({ container, src: 'http://localhost:5174/', theme: { mode: 'dark' } })
    widget.mount()
    const postSpy = vi.spyOn(getIframeWindow(widget), 'postMessage')

    dispatchFromWidget(widget, { jsonrpc: JSONRPC_VERSION, method: 'ready' })

    expect(postSpy).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'setTheme', params: { mode: 'dark' } }),
      expect.any(String)
    )
  })

  it('rejects a call whose response reports an error', async () => {
    const widget = new ParcelIQWidget({ container, src: 'http://localhost:5174/' })
    widget.mount()
    dispatchFromWidget(widget, { jsonrpc: JSONRPC_VERSION, method: 'ready' })
    const postSpy = vi.spyOn(getIframeWindow(widget), 'postMessage')

    const promise = widget.loadProperty('nowhere')
    const [sentMessage] = postSpy.mock.calls[0] as [{ id: string | number }]
    dispatchFromWidget(widget, {
      jsonrpc: JSONRPC_VERSION,
      id: sentMessage.id,
      error: { code: -32000, message: 'No results found' },
    })

    await expect(promise).rejects.toThrow('No results found')
  })

  it('dispatches propertyFlagged notifications to registered .on() handlers', () => {
    const widget = new ParcelIQWidget({ container, src: 'http://localhost:5174/' })
    widget.mount()
    const handler = vi.fn()
    widget.on('propertyFlagged', handler)

    dispatchFromWidget(widget, {
      jsonrpc: JSONRPC_VERSION,
      method: 'propertyFlagged',
      params: { address: '123 Main St', reason: 'roof damage' },
    })

    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith({ address: '123 Main St', reason: 'roof damage' })
  })

  it('ignores incoming messages from an untrusted origin', () => {
    const widget = new ParcelIQWidget({ container, src: 'http://localhost:5174/' })
    widget.mount()
    const handler = vi.fn()
    widget.on('propertyFlagged', handler)

    dispatchFromWidget(
      widget,
      { jsonrpc: JSONRPC_VERSION, method: 'propertyFlagged', params: { address: 'x', reason: 'y' } },
      'https://evil.example.com'
    )

    expect(handler).not.toHaveBeenCalled()
  })

  it('updates the iframe height when a resize notification arrives', () => {
    const widget = new ParcelIQWidget({ container, src: 'http://localhost:5174/' })
    const iframe = widget.mount()

    dispatchFromWidget(widget, { jsonrpc: JSONRPC_VERSION, method: 'resize', params: { height: 480 } })

    expect(iframe.style.height).toBe('480px')
  })

  it('reports every message through onMessage in both directions', () => {
    const onMessage = vi.fn()
    const widget = new ParcelIQWidget({ container, src: 'http://localhost:5174/', onMessage })
    widget.mount()

    dispatchFromWidget(widget, { jsonrpc: JSONRPC_VERSION, method: 'ready' })

    expect(onMessage).toHaveBeenCalledWith('incoming', expect.objectContaining({ method: 'ready' }))
  })

  it('rejects in-flight calls when destroyed', async () => {
    const widget = new ParcelIQWidget({ container, src: 'http://localhost:5174/' })
    widget.mount()
    dispatchFromWidget(widget, { jsonrpc: JSONRPC_VERSION, method: 'ready' })

    const promise = widget.ping()
    widget.destroy()

    await expect(promise).rejects.toThrow('destroyed')
  })

  it('removes the iframe from the DOM when destroyed', () => {
    const widget = new ParcelIQWidget({ container, src: 'http://localhost:5174/' })
    widget.mount()
    widget.destroy()
    expect(container.children).toHaveLength(0)
  })
})
