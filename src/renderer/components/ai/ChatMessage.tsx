interface ChatMessageProps {
  role: 'user' | 'assistant'
  content: string
}

export function ChatMessage({ role, content }: ChatMessageProps) {
  const isUser = role === 'user'

  return (
    <div
      className={`max-w-[90%] rounded-xl px-3 py-2 ${isUser ? 'self-end' : 'self-start'}`}
      style={{
        background: isUser ? 'var(--accent)' : 'rgba(255,255,255,0.06)',
        borderRadius: isUser ? '12px 12px 4px 12px' : '4px 12px 12px 12px',
      }}
    >
      <div
        className="text-xs leading-relaxed whitespace-pre-wrap break-words"
        style={{ color: isUser ? 'white' : 'var(--text-primary)' }}
      >
        {content}
      </div>
    </div>
  )
}
