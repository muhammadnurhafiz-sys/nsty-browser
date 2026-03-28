interface ChatMessageProps {
  role: 'user' | 'assistant'
  content: string
}

export function ChatMessage({ role, content }: ChatMessageProps) {
  const isUser = role === 'user'

  return (
    <div
      className={`max-w-[90%] rounded-xl px-3.5 py-2.5 ${isUser ? 'self-end' : 'self-start'}`}
      style={{
        background: isUser ? 'rgba(206, 250, 5, 0.12)' : 'var(--surface-container)',
        borderRadius: isUser ? '12px 12px 4px 12px' : '4px 12px 12px 12px',
        border: isUser ? '1px solid rgba(206, 250, 5, 0.15)' : '1px solid rgba(73, 72, 71, 0.1)',
      }}
    >
      <div
        className="font-body text-xs leading-relaxed whitespace-pre-wrap break-words"
        style={{ color: isUser ? 'var(--primary)' : 'var(--on-surface)' }}
      >
        {content}
      </div>
    </div>
  )
}
