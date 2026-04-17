import { useEffect, useRef } from 'react'
import type { AiMessage } from '../../hooks/useAi'

interface AiChatInlineProps {
  messages: AiMessage[]
  streamingContent: string
  isStreaming: boolean
}

export function AiChatInline({ messages, streamingContent, isStreaming }: AiChatInlineProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [])

  if (messages.length === 0 && !isStreaming) {
    return (
      <div className="px-3 py-4 text-center">
        <span className="font-body text-[11px]" style={{ color: 'rgba(var(--primary-rgb), 0.35)' }}>
          Type a message after @claude to chat
        </span>
      </div>
    )
  }

  return (
    <div
      ref={scrollRef}
      className="overflow-y-auto hide-scrollbar expand-down"
      style={{ maxHeight: '50vh' }}
    >
      <div className="flex flex-col gap-2 px-2 py-2">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className="rounded-lg px-2.5 py-1.5"
            style={{
              background: msg.role === 'user'
                ? 'var(--border-subtle)'
                : 'rgba(var(--neutral-rgb), 0.04)',
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '95%',
            }}
          >
            <span className="font-body text-[11px] leading-relaxed" style={{
              color: msg.role === 'user' ? 'rgba(var(--primary-rgb), 0.8)' : 'rgba(var(--neutral-rgb), 0.7)',
            }}>
              {msg.content}
            </span>
          </div>
        ))}
        {isStreaming && streamingContent && (
          <div
            className="rounded-lg px-2.5 py-1.5"
            style={{ background: 'rgba(var(--neutral-rgb), 0.04)', maxWidth: '95%' }}
          >
            <span className="font-body text-[11px] leading-relaxed" style={{ color: 'rgba(var(--neutral-rgb), 0.7)' }}>
              {streamingContent}
            </span>
          </div>
        )}
        {isStreaming && !streamingContent && (
          <div className="flex gap-1 px-2 py-2">
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'rgba(var(--primary-rgb), 0.4)', animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'rgba(var(--primary-rgb), 0.4)', animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'rgba(var(--primary-rgb), 0.4)', animationDelay: '300ms' }} />
          </div>
        )}
      </div>
    </div>
  )
}
