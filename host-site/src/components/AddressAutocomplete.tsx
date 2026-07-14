import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Loader2, MapPin } from 'lucide-react'
import { Input, cn } from '@parceliq/ui'

import { MIN_ADDRESS_QUERY_LENGTH, useAddressSuggestions } from '../hooks/use-address-suggestions'
import type { PropertySuggestion } from '../lib/property-suggest'

export interface AddressAutocompleteProps {
  id?: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  placeholder?: string
}

/**
 * A small combobox for the "Add lead" address field: a plain `Input` plus an
 * absolutely-positioned suggestion list, since there's no combobox primitive
 * in `@parceliq/ui` to reuse (see `component-library.mdc` — this is
 * domain-specific to the "Add lead" form, so it lives here rather than
 * being added there).
 */
export function AddressAutocomplete({ id, value, onChange, required, placeholder }: AddressAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const { suggestions, isLoading } = useAddressSuggestions(value)

  const showDropdown = isOpen && value.trim().length >= MIN_ADDRESS_QUERY_LENGTH

  // The list isn't a Radix popover, so closing it on an outside click needs
  // to be done by hand instead of coming for free.
  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [])

  // Reset the highlight whenever a new suggestion list arrives, adjusted
  // synchronously during render rather than via a `useEffect` + `setState`
  // (React's recommended alternative — see the equivalent pattern in `App`).
  const [suggestionsForHighlightReset, setSuggestionsForHighlightReset] = useState(suggestions)
  if (suggestionsForHighlightReset !== suggestions) {
    setSuggestionsForHighlightReset(suggestions)
    if (highlightedIndex !== 0) setHighlightedIndex(0)
  }

  function selectSuggestion(suggestion: PropertySuggestion) {
    onChange(suggestion.address)
    setIsOpen(false)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      setIsOpen(false)
      return
    }

    if (!showDropdown || suggestions.length === 0) return

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setHighlightedIndex((index) => (index + 1) % suggestions.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setHighlightedIndex((index) => (index - 1 + suggestions.length) % suggestions.length)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      selectSuggestion(suggestions[highlightedIndex])
    }
  }

  const listboxId = id ? `${id}-listbox` : undefined

  return (
    <div ref={containerRef} className="relative">
      <Input
        id={id}
        required={required}
        placeholder={placeholder}
        value={value}
        autoComplete="off"
        role="combobox"
        aria-expanded={showDropdown}
        aria-autocomplete="list"
        aria-controls={listboxId}
        onChange={(e) => {
          onChange(e.target.value)
          setIsOpen(true)
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
      />
      {showDropdown && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-border bg-popover p-1 shadow-md"
        >
          {isLoading && (
            <li className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              Searching…
            </li>
          )}
          {!isLoading && suggestions.length === 0 && (
            <li className="px-3 py-2 text-sm text-muted-foreground">No matches found</li>
          )}
          {!isLoading &&
            suggestions.map((suggestion, index) => (
              // `role="option"` and the click handler live on the same
              // element deliberately — a click's event target is whatever
              // was actually clicked, so if the accessible "option" were a
              // `<li>` wrapping a separate `<button onClick>`, clicking the
              // li itself (which is what `getByRole('option')` resolves to)
              // wouldn't bubble down into the button at all.
              <li
                key={`${suggestion.address}-${index}`}
                role="option"
                aria-selected={index === highlightedIndex}
                className={cn(
                  'flex cursor-pointer items-start gap-2 rounded-sm px-3 py-2 text-sm hover:bg-accent',
                  index === highlightedIndex && 'bg-accent',
                )}
                onMouseEnter={() => setHighlightedIndex(index)}
                onClick={() => selectSuggestion(suggestion)}
              >
                <MapPin className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span className="min-w-0 truncate">{suggestion.address}</span>
              </li>
            ))}
        </ul>
      )}
    </div>
  )
}
