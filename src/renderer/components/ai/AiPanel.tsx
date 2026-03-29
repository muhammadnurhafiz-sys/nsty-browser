import { useEffect, useRef } from 'react'
import { ChatMessage } from './ChatMessage'
import { ChatInput } from './ChatInput'
import { ModelSelector } from './ModelSelector'

interface AiMessage {
  role: 'user' | 'assistant'
  content: string
}

interface AiPanelProps {
  isOpen: boolean
  messages: AiMessage[]
  streamingContent: string
  isStreaming: boolean
  model: 'sonnet' | 'haiku' | 'opus'
  onSend: (message: string) => void
  onModelChange: (model: 'sonnet' | 'haiku' | 'opus') => void
  onClose: () => void
}

export function AiPanel({
  isOpen,
  messages,
  streamingContent,
  isStreaming,
  model,
  onSend,
  onModelChange,
  onClose,
}: AiPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, streamingContent])

  if (!isOpen) return null

  return (
    <div
      className="h-full flex flex-col flex-shrink-0 slide-in-right"
      role="complementary"
      aria-label="AI Assistant"
      style={{
        width: 340,
        background: 'var(--surface-container-highest)',
        borderLeft: '1px solid rgba(73, 72, 71, 0.15)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid rgba(73, 72, 71, 0.1)' }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-6 h-6 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(206, 250, 5, 0.15)' }}
          >
            <span className="material-symbols-outlined text-[14px]" style={{ color: 'var(--primary)' }}>
              auto_awesome
            </span>
          </div>
          <span className="font-headline text-sm font-semibold" style={{ color: 'var(--on-surface)' }}>
            Claude
          </span>
          <ModelSelector model={model} onChange={onModelChange} />
        </div>
        <button
          onClick={onClose}
          aria-label="Close AI panel"
          className="w-7 h-7 rounded-full flex items-center justify-center cursor-pointer hover:bg-white/10 transition-colors"
          style={{ color: 'var(--outline)' }}
        >
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">close</span>
        </button>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3"
      >
        {messages.length === 0 && !isStreaming && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center px-6">
              <span
                className="material-symbols-outlined mb-3 block"
                style={{ fontSize: 32, color: 'var(--primary)', opacity: 0.4 }}
              >
                auto_awesome
              </span>
              <p className="font-body text-xs" style={{ color: 'var(--outline)' }}>
                Ask Claude anything about the page you're viewing, or start a new conversation.
              </p>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <ChatMessage key={i} role={msg.role} content={msg.content} />
        ))}

        {/* Streaming response */}
        {isStreaming && streamingContent && (
          <ChatMessage role="assistant" content={streamingContent} />
        )}

        {/* Streaming indicator */}
        {isStreaming && !streamingContent && (
          <div className="self-start" role="status" aria-label="AI is thinking">
            <div
              className="rounded-xl px-3 py-2"
              style={{ background: 'var(--surface-container)' }}
            >
              <div className="flex gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--primary)', opacity: 0.6 }} />
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--primary)', opacity: 0.6, animationDelay: '0.2s' }} />
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--primary)', opacity: 0.6, animationDelay: '0.4s' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <ChatInput onSend={onSend} disabled={isStreaming} />
    </div>
  )
}
