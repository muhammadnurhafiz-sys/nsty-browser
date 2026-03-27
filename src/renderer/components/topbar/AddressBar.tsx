import { useState, useRef, useEffect } from 'react'

interface AddressBarProps {
  url: string
  onNavigate: (url: string) => void
}

export function AddressBar({ url, onNavigate }: AddressBarProps) {
  const [inputValue, setInputValue] = useState(url)
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isFocused) {
      setInputValue(url)
    }
  }, [url, isFocused])

  // Listen for focus shortcut from main process
  useEffect(() => {
    if (!window.nsty?.onFocusAddressBar) return
    return window.nsty.onFocusAddressBar(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    })
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const value = inputValue.trim()
      if (!value) return

      // Detect if it's a URL or search query
      const isUrl = value.includes('.') && !value.includes(' ')
      const navigateUrl = isUrl && !value.startsWith('http')
        ? `https://${value}`
        : isUrl
          ? value
          : `https://www.google.com/search?q=${encodeURIComponent(value)}`

      onNavigate(navigateUrl)
      inputRef.current?.blur()
    } else if (e.key === 'Escape') {
      setInputValue(url)
      inputRef.current?.blur()
    }
  }

  const displayUrl = isFocused ? inputValue : url

  return (
    <div
      className="flex-1 h-8 flex items-center px-3 gap-2"
      style={{
        background: isFocused ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)',
        border: isFocused ? '1px solid var(--accent)' : '1px solid transparent',
        borderRadius: 'var(--radius-md)',
      }}
    >
      {!isFocused && url.startsWith('https') && (
        <span className="text-[10px]" style={{ color: 'var(--green)' }}>🔒</span>
      )}
      <input
        ref={inputRef}
        type="text"
        value={displayUrl}
        onChange={(e) => setInputValue(e.target.value)}
        onFocus={() => {
          setIsFocused(true)
          setTimeout(() => inputRef.current?.select(), 0)
        }}
        onBlur={() => setIsFocused(false)}
        onKeyDown={handleKeyDown}
        placeholder="Search or enter URL..."
        className="flex-1 bg-transparent outline-none text-[13px]"
        style={{ color: isFocused ? 'var(--text-primary)' : 'var(--text-secondary)' }}
      />
    </div>
  )
}
