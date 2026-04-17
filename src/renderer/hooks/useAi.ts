import { useState, useEffect, useCallback } from 'react'

export interface AiMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

const newId = (): string => (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
  ? crypto.randomUUID()
  : `m-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`)

export function useAi() {
  const [messages, setMessages] = useState<AiMessage[]>([])
  const [streamingContent, setStreamingContent] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [model, setModel] = useState<'sonnet' | 'haiku' | 'opus'>('sonnet')
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  // Listen for IPC events
  useEffect(() => {
    if (!window.nsty) return

    const cleanupStream = window.nsty.onAiStream((chunk) => {
      setStreamingContent(prev => prev + chunk)
    })

    const cleanupStreamEnd = window.nsty.onAiStreamEnd(() => {
      setStreamingContent(prev => {
        if (prev) {
          setMessages(msgs => [...msgs, { id: newId(), role: 'assistant', content: prev }])
        }
        return ''
      })
      setIsStreaming(false)
    })

    return () => {
      cleanupStream()
      cleanupStreamEnd()
    }
  }, [])

  const sendMessage = useCallback((message: string) => {
    if (!window.nsty || isStreaming) return

    // Add user message to UI immediately
    setMessages(prev => [...prev, { id: newId(), role: 'user', content: message }])
    setIsStreaming(true)
    setStreamingContent('')

    // Send to main process
    window.nsty.sendAiMessage(message, conversationId)
  }, [isStreaming, conversationId])

  const changeModel = useCallback((newModel: 'sonnet' | 'haiku' | 'opus') => {
    setModel(newModel)
  }, [])

  const togglePanel = useCallback(() => {
    setIsOpen(prev => !prev)
  }, [])

  const closePanel = useCallback(() => {
    setIsOpen(false)
  }, [])

  const clearConversation = useCallback(() => {
    setMessages([])
    setConversationId(null)
    setStreamingContent('')
  }, [])

  return {
    messages,
    streamingContent,
    isStreaming,
    model,
    isOpen,
    sendMessage,
    changeModel,
    togglePanel,
    closePanel,
    clearConversation,
  }
}
