import { useEffect } from 'react'
import type { Tab } from '@shared/types'
import { useCommandBar } from '../../hooks/useCommandBar'
import { useSettings } from '../../hooks/useSettings'
import { AiChatInline } from './AiChatInline'
import { SettingsCommandList } from './SettingsCommandList'
import { CommandResults } from './CommandResults'

interface AiState {
  messages: { role: 'user' | 'assistant'; content: string }[]
  streamingContent: string
  isStreaming: boolean
  model: 'sonnet' | 'haiku' | 'opus'
  sendMessage: (message: string) => void
  changeModel: (model: 'sonnet' | 'haiku' | 'opus') => void
}

interface CommandBarProps {
  onNavigate: (url: string) => void
  tabs: Tab[]
  onSwitchTab: (tabId: string) => void
  ai: AiState
  isExpanded: boolean
  onExpandSidebar?: () => void
}

export function CommandBar({ onNavigate, tabs, onSwitchTab, ai, isExpanded, onExpandSidebar }: CommandBarProps) {
  const {
    query,
    mode,
    isExpanded: panelOpen,
    inputRef,
    updateQuery,
    getAiQuery,
    getSettingsFilter,
    resolveNavigation,
    expand,
    collapse,
    focus,
  } = useCommandBar()

  const { items: settingsItems } = useSettings()

  // Listen for Ctrl+L / Ctrl+T to focus command bar
  useEffect(() => {
    if (!window.nsty?.onFocusAddressBar) return
    return window.nsty.onFocusAddressBar(() => {
      focus()
      expand()
    })
  }, [focus, expand])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const value = query.trim()
      if (!value) return

      if (mode === 'ai') {
        const aiQuery = getAiQuery()
        // Model switching: @claude /opus, @claude /sonnet, @claude /haiku
        const modelMatch = aiQuery.match(/^\/?(opus|sonnet|haiku)$/i)
        if (modelMatch?.[1]) {
          ai.changeModel(modelMatch[1].toLowerCase() as 'sonnet' | 'haiku' | 'opus')
          updateQuery('@claude ')
        } else if (aiQuery) {
          ai.sendMessage(aiQuery)
          updateQuery('@claude ')
        }
      } else if (mode === 'settings') {
        // Settings are interacted with inline, Enter does nothing
      } else {
        // URL / search navigation
        const url = resolveNavigation(value)
        if (url) {
          onNavigate(url)
          collapse()
        }
      }
    } else if (e.key === 'Escape') {
      collapse()
    }
  }

  const handleFocus = () => {
    expand()
    inputRef.current?.select()
  }

  if (!isExpanded) {
    // Collapsed sidebar: show just a search icon button
    return (
      <div className="flex justify-center py-2">
        <button
          onClick={() => { onExpandSidebar?.(); }}
          className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors"
          style={{ background: 'var(--command-bar-bg)', border: '1px solid var(--command-bar-border)' }}
          aria-label="Search or navigate"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'rgba(206, 250, 5, 0.4)' }}>search</span>
        </button>
      </div>
    )
  }

  // Mode indicator chip
  const modeChip = mode === 'ai'
    ? { label: `AI · ${ai.model}`, color: 'rgba(206, 250, 5, 0.6)' }
    : mode === 'settings'
      ? { label: 'Settings', color: 'rgba(206, 250, 5, 0.5)' }
      : null

  const modeAnnouncement = mode === 'ai' ? `AI mode, model: ${ai.model}` : mode === 'settings' ? 'Settings mode' : ''

  return (
    <div className="px-3 py-2">
      {/* Screen reader announcement for mode changes */}
      <div aria-live="polite" aria-atomic="true" className="sr-only" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden' }}>
        {modeAnnouncement}
      </div>
      {/* Input */}
      <div
        className="rounded-[10px] flex items-center gap-2 px-3"
        style={{
          background: 'var(--command-bar-bg)',
          border: `1px solid ${panelOpen ? 'var(--border-active)' : 'var(--command-bar-border)'}`,
          height: 34,
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 14, color: 'rgba(206, 250, 5, 0.4)' }}>
          {mode === 'ai' ? 'smart_toy' : mode === 'settings' ? 'settings' : 'search'}
        </span>
        {modeChip && (
          <span
            className="font-label text-[8px] uppercase px-1.5 py-0.5 rounded"
            style={{ background: 'rgba(206, 250, 5, 0.1)', color: modeChip.color, letterSpacing: '0.08em' }}
          >
            {modeChip.label}
          </span>
        )}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => updateQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          placeholder="Search, URL, or @claude..."
          className="flex-1 bg-transparent font-body text-xs outline-none"
          style={{ color: 'rgba(255, 255, 255, 0.8)' }}
          spellCheck={false}
        />
      </div>

      {/* Inline panels based on mode */}
      {panelOpen && mode === 'ai' && (
        <AiChatInline
          messages={ai.messages}
          streamingContent={ai.streamingContent}
          isStreaming={ai.isStreaming}
        />
      )}

      {panelOpen && mode === 'settings' && (
        <SettingsCommandList
          items={settingsItems}
          filter={getSettingsFilter()}
        />
      )}

      {panelOpen && mode === 'default' && query.trim() && (
        <CommandResults
          tabs={tabs}
          query={query}
          onSwitchTab={(tabId) => { onSwitchTab(tabId); collapse() }}
        />
      )}
    </div>
  )
}
