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
      className="h-full flex flex-col flex-shrink-0"
      style={{
        width: 300,
        background: 'var(--bg-sidebar)',
        borderLeft: '1px solid var(--border)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3.5 py-2.5"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-5 h-5 rounded-[5px] flex items-center justify-center text-[10px]"
            style={{ background: 'linear-gradient(135deg, #fb923c, #f97316)' }}
          >
            C
          </div>
          <span className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
            Claude
          </span>
          <ModelSelector model={model} onChange={onModelChange} />
        </div>
        <button
          onClick={onClose}
          className="text-sm cursor-pointer hover:opacity-80"
          style={{ color: 'var(--text-muted)' }}
        >
          ×
        </button>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2.5"
      >
        {messages.length === 0 && !isStreaming && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center px-4">
              <div className="text-2xl mb-2">✨</div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
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
          <div className="self-start">
            <div
              className="rounded-xl px-3 py-2"
              style={{ background: 'rgba(255,255,255,0.06)' }}
            >
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--text-muted)' }} />
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--text-muted)', animationDelay: '0.2s' }} />
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--text-muted)', animationDelay: '0.4s' }} />
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
