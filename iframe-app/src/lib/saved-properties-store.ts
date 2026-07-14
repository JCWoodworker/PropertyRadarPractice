import type { PropertyResult } from '@parceliq/embed-sdk'

const STORAGE_KEY = 'parceliq.savedProperties.v1'

export interface SavedProperty extends PropertyResult {
  reason: string
  savedAt: string
}

function readAll(): SavedProperty[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as SavedProperty[]) : []
  } catch {
    return []
  }
}

function writeAll(items: SavedProperty[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

export async function listSavedProperties(): Promise<SavedProperty[]> {
  return readAll()
}

export async function saveProperty(property: PropertyResult, reason: string): Promise<SavedProperty[]> {
  const existing = readAll().filter((item) => item.address !== property.address)
  const next = [{ ...property, reason, savedAt: new Date().toISOString() }, ...existing]
  writeAll(next)
  return next
}

export async function removeSavedProperty(address: string): Promise<SavedProperty[]> {
  const next = readAll().filter((item) => item.address !== address)
  writeAll(next)
  return next
}
