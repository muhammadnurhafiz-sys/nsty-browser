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
      className="px-2.5 py-2.5"
      style={{ borderTop: '1px solid var(--border)' }}
    >
      <div
        className="flex items-end gap-2 rounded-xl px-3 py-2"
        style={{ background: 'rgba(255,255,255,0.06)' }}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? 'Waiting for response...' : 'Ask Claude about this page...'}
          disabled={disabled}
          rows={1}
          className="flex-1 bg-transparent outline-none text-xs resize-none leading-relaxed"
          style={{
            color: 'var(--text-secondary)',
            maxHeight: 120,
          }}
        />
        <button
          onClick={handleSend}
          disabled={disabled || !value.trim()}
          className="w-6 h-6 rounded-md flex items-center justify-center text-xs cursor-pointer flex-shrink-0"
          style={{
            background: value.trim() && !disabled ? 'var(--accent)' : 'rgba(255,255,255,0.06)',
            color: 'white',
            opacity: value.trim() && !disabled ? 1 : 0.5,
          }}
        >
          ↑
        </button>
      </div>
    </div>
  )
}
