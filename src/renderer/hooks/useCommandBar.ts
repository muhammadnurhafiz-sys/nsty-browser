import { useState, useCallback, useRef } from 'react'

export type CommandBarMode = 'default' | 'ai' | 'settings' | 'tabs'

export function useCommandBar() {
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<CommandBarMode>('default')
  const [isExpanded, setIsExpanded] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const updateQuery = useCallback((value: string) => {
    setQuery(value)

    // Detect mode from prefix
    if (value.startsWith('@claude') || value.startsWith('@')) {
      if (mode !== 'ai') setMode('ai')
    } else if (value.startsWith('/settings') || value.startsWith('/')) {
      if (mode !== 'settings') setMode('settings')
    } else {
      if (mode !== 'default' && mode !== 'tabs') setMode('default')
    }
  }, [mode])

  const getAiQuery = useCallback((): string => {
    // Strip @claude prefix to get the actual message
    return query.replace(/^@claude\s*/, '').replace(/^@\s*/, '').trim()
  }, [query])

  const getSettingsFilter = useCallback((): string => {
    // Strip /settings prefix to get the filter
    return query.replace(/^\/settings\s*/, '').replace(/^\/\s*/, '').trim()
  }, [query])

  const resolveNavigation = useCallback((value: string): string => {
    const trimmed = value.trim()
    if (!trimmed) return ''

    const isUrl = trimmed.includes('.') && !trimmed.includes(' ')
    if (isUrl && !trimmed.startsWith('http')) return `https://${trimmed}`
    if (isUrl) return trimmed
    return `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`
  }, [])

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
