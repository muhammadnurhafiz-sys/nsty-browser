import { useEffect, useRef, useState } from 'react'
import { resolveNavigation } from '../../hooks/useCommandBar'
import { createLogger } from '../../utils/logger'

const log = createLogger('AddressBar')

interface AddressBarProps {
  currentUrl: string
  onNavigate: (url: string) => void
}

export function AddressBar({ currentUrl, onNavigate }: AddressBarProps) {
  const [value, setValue] = useState(currentUrl)
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Keep the input mirrored to the active tab's URL while the user isn't editing.
  // Without this, navigating via link clicks or goBack wouldn't reflect in the bar.
  useEffect(() => {
    if (document.activeElement !== inputRef.current) {
      setValue(currentUrl)
    }
  }, [currentUrl])

  // Wire up the Ctrl/Cmd+L "focus address bar" shortcut that main process broadcasts.
  useEffect(() => {
    if (!window.nsty?.onFocusAddressBar) return
    return window.nsty.onFocusAddressBar(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    })
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const trimmed = value.trim()
      if (!trimmed) return
      const url = resolveNavigation(trimmed)
      if (url) {
        log.info('navigate', { url })
        onNavigate(url)
        inputRef.current?.blur()
      }
    } else if (e.key === 'Escape') {
      setValue(currentUrl)
      inputRef.current?.blur()
    }
  }

  return (
    <div
      className="flex-1 min-w-0"
      style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
    >
      <div
        className="rounded-lg flex items-center gap-2 px-3 h-8 min-w-0"
        style={{
          background: 'var(--command-bar-bg)',
          border: `1px solid ${focused ? 'var(--border-active)' : 'var(--command-bar-border)'}`,
        }}
      >
        <span
          className="material-symbols-outlined flex-shrink-0"
          style={{ fontSize: 14, color: 'rgba(var(--primary-rgb), 0.45)' }}
        >
          {currentUrl.startsWith('https://') ? 'lock' : 'search'}
        </span>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => { setFocused(true); inputRef.current?.select() }}
          onBlur={() => {
            setFocused(false)
            // Revert to the canonical URL if the user didn't commit a change.
            if (value !== currentUrl) setValue(currentUrl)
          }}
          placeholder="Search or enter a URL"
          aria-label="Address bar"
          className="flex-1 bg-transparent font-mono text-xs outline-none min-w-0"
          style={{ color: 'rgba(var(--neutral-rgb), 0.9)' }}
          spellCheck={false}
        />
      </div>
    </div>
  )
}
