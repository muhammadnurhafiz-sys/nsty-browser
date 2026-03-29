import { useState, useCallback, useRef } from 'react'

export type CommandBarMode = 'default' | 'ai' | 'settings' | 'tabs'

/** Detect command bar mode from input value */
export function detectMode(value: string): CommandBarMode | null {
  if (value.startsWith('@claude ') || value === '@claude') return 'ai'
  if (value.startsWith('/settings ') || value === '/settings') return 'settings'
  return null
}

/** Strip @claude prefix to get the AI message */
export function extractAiQuery(query: string): string {
  return query.replace(/^@claude\s*/, '').trim()
}

/** Strip /settings prefix to get the filter */
export function extractSettingsFilter(query: string): string {
  return query.replace(/^\/settings\s*/, '').trim()
}

/** Resolve input value to a navigation URL */
export function resolveNavigation(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''

  const isUrl = trimmed.includes('.') && !trimmed.includes(' ')
  if (isUrl && !trimmed.startsWith('http')) return `https://${trimmed}`
  if (isUrl) return trimmed
  return `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`
}

export function useCommandBar() {
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<CommandBarMode>('default')
  const [isExpanded, setIsExpanded] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const updateQuery = useCallback((value: string) => {
    setQuery(value)
    const detected = detectMode(value)
    if (detected) {
      if (mode !== detected) setMode(detected)
    } else {
      if (mode !== 'default' && mode !== 'tabs') setMode('default')
    }
  }, [mode])

  const getAiQuery = useCallback((): string => {
    return extractAiQuery(query)
  }, [query])

  const getSettingsFilter = useCallback((): string => {
    return extractSettingsFilter(query)
  }, [query])

  const expand = useCallback(() => {
    setIsExpanded(true)
  }, [])

  const collapse = useCallback(() => {
    setIsExpanded(false)
    setQuery('')
    setMode('default')
    inputRef.current?.blur()
  }, [])

  const focus = useCallback(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  return {
    query,
    mode,
    isExpanded,
    inputRef,
    updateQuery,
    getAiQuery,
    getSettingsFilter,
    resolveNavigation,
    expand,
    collapse,
    focus,
  }
}
