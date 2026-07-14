import { useEffect, useRef } from 'react'
import { ParcelIQWidget, type PropertyResult, type ThemeOptions } from '@parceliq/embed-sdk'

export interface RpcLogEntry {
  id: string
  direction: 'outgoing' | 'incoming'
  message: unknown
  timestamp: number
}

export interface ParcelIQEmbedProps {
  address: string
  theme: ThemeOptions
  onFlagged: (address: string, reason: string) => void
  onPropertyLoaded?: (property: PropertyResult) => void
  onWidgetError?: (message: string) => void
  onLog: (entry: RpcLogEntry) => void
}

// In production this would come from an env var / per-tenant config; hardcoded here to keep the POC's local setup a one-liner.
const WIDGET_URL = 'http://localhost:5174'

/**
 * React wrapper around the `@parceliq/embed-sdk` class — this is what a
 * real host application would ship instead of a raw `<iframe>` tag. Mounts
 * once per `key` (the parent keys this by lead id), then drives subsequent
 * address/theme changes through the SDK's promise-based API rather than
 * remounting the iframe.
 */
export function ParcelIQEmbed({ address, theme, onFlagged, onPropertyLoaded, onWidgetError, onLog }: ParcelIQEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetRef = useRef<ParcelIQWidget | null>(null)
  const initialThemeRef = useRef(theme)

  // Refs must never be written during render (breaks render purity) — sync
  // this one in an effect instead of assigning `.current` inline here.
  const callbacksRef = useRef({ onFlagged, onPropertyLoaded, onWidgetError, onLog })
  useEffect(() => {
    callbacksRef.current = { onFlagged, onPropertyLoaded, onWidgetError, onLog }
  }, [onFlagged, onPropertyLoaded, onWidgetError, onLog])

  useEffect(() => {
    if (!containerRef.current) return

    const widget = new ParcelIQWidget({
      container: containerRef.current,
      src: WIDGET_URL,
      theme: initialThemeRef.current,
      title: 'ParcelIQ property widget',
      onMessage: (direction, message) => {
        callbacksRef.current.onLog({ id: crypto.randomUUID(), direction, message, timestamp: Date.now() })
      },
    })

    widget.mount()
    widgetRef.current = widget

    const unsubscribeFlagged = widget.on('propertyFlagged', ({ address, reason }) => {
      callbacksRef.current.onFlagged(address, reason)
    })
    const unsubscribeLoaded = widget.on('propertyLoaded', (property) => {
      callbacksRef.current.onPropertyLoaded?.(property)
    })
    const unsubscribeError = widget.on('error', ({ message }) => {
      callbacksRef.current.onWidgetError?.(message)
    })

    return () => {
      unsubscribeFlagged()
      unsubscribeLoaded()
      unsubscribeError()
      widget.destroy()
      widgetRef.current = null
    }
  }, [])

  useEffect(() => {
    widgetRef.current?.loadProperty(address).catch((err: unknown) => {
      const message = err instanceof Error ? err.message : 'Failed to load property'
      callbacksRef.current.onWidgetError?.(message)
    })
  }, [address])

  useEffect(() => {
    void widgetRef.current?.setTheme(theme)
  }, [theme])

  return <div ref={containerRef} className="overflow-hidden rounded-lg border border-border" />
}
