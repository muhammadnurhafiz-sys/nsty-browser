import { useState, useRef, useCallback } from 'react'

interface ChatInputProps {
  onSend: (message: string) => void
  disabled: boolean
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = useCallback(() => {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setValue('')
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [value, disabled, onSend])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value)
    // Auto-resize textarea
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }

  return (
    <div
      className="px-3 py-3"
      style={{ borderTop: '1px solid rgba(73, 72, 71, 0.1)' }}
    >
      <div
        className="flex items-end gap-2 rounded-xl px-3.5 py-2.5"
        style={{
          background: 'var(--surface-container)',
          border: '1px solid rgba(73, 72, 71, 0.1)',
        }}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? 'Waiting for response...' : 'Ask Claude about this page...'}
          aria-label="Message to Claude"
          disabled={disabled}
          rows={1}
          className="flex-1 bg-transparent outline-none font-body text-xs resize-none leading-relaxed"
          style={{
            color: 'var(--on-surface-variant)',
            maxHeight: 120,
          }}
        />
        <button
          onClick={handleSend}
          disabled={disabled || !value.trim()}
          aria-label="Send message"
          className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer flex-shrink-0 transition-all"
          style={{
            background: value.trim() && !disabled ? 'var(--primary)' : 'var(--surface-container-high)',
            color: value.trim() && !disabled ? 'var(--on-primary)' : 'var(--outline)',
            opacity: value.trim() && !disabled ? 1 : 0.5,
          }}
        >
          <span className="material-symbols-outlined text-[16px]" aria-hidden="true">arrow_upward</span>
        </button>
      </div>
    </div>
  )
}
