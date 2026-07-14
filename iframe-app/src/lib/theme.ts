import type { ThemeOptions } from '@parceliq/embed-sdk'

/** Applies a host-provided theme to the widget's own document so it re-skins to match the host's branding. */
export function applyTheme(theme: ThemeOptions): void {
  const root = document.documentElement
  root.classList.toggle('dark', theme.mode === 'dark')

  if (theme.primaryColor) {
    root.style.setProperty('--primary', theme.primaryColor)
  } else {
    root.style.removeProperty('--primary')
  }
}
