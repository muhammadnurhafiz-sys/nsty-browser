import { useState, useEffect, useCallback } from 'react'

interface HistoryEntry {
  id: number
  url: string
  title: string
  favicon_url: string
  visit_count: number
  last_visited_at: string
  space_id: string
}

interface HistoryPanelProps {
  isOpen: boolean
  onClose: () => void
  onNavigate: (url: string) => void
}

export function HistoryPanel({ isOpen, onClose, onNavigate }: HistoryPanelProps) {
  const [query, setQuery] = useState('')
  const [entries, setEntries] = useState<HistoryEntry[]>([])

  // Search history when query changes
  useEffect(() => {
    if (!isOpen) return
    // TODO: Wire to IPC for actual SQLite search
    // For now, entries stay empty until IPC is connected
  }, [query, isOpen])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />

      {/* Panel */}
      <div
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[560px] max-h-[70vh] rounded-xl flex flex-col shadow-2xl"
        style={{
          background: 'var(--bg-sidebar)',
          border: '1px solid var(--border)',
        }}
        onKeyDown={handleKeyDown}
      >
        {/* Search header */}
        <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>🔍</span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search history..."
            autoFocus
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: 'var(--text-primary)' }}
          />
          <button
            onClick={onClose}
            className="text-xs px-2 py-1 rounded cursor-pointer"
            style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}
          >
            ESC
          </button>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {entries.length === 0 && (
            <div className="flex items-center justify-center py-8">
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {query ? 'No matching history entries' : 'Browse history will appear here'}
              </p>
            </div>
          )}

          {entries.map(entry => (
            <button
              key={entry.id}
              onClick={() => { onNavigate(entry.url); onClose() }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-left hover:bg-white/5"
            >
              {entry.favicon_url ? (
                <img src={entry.favicon_url} className="w-4 h-4 rounded-sm flex-shrink-0" alt="" />
              ) : (
                <div
                  className="w-4 h-4 rounded-sm flex items-center justify-center text-[8px] flex-shrink-0"
                  style={{ background: 'var(--blue)' }}
                >
                  {(entry.title || entry.url).charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-xs truncate" style={{ color: 'var(--text-primary)' }}>
                  {entry.title || entry.url}
                </div>
                <div className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>
                  {entry.url}
                </div>
              </div>
              <div className="text-[10px] flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                {entry.visit_count > 1 ? `${entry.visit_count}×` : ''}
              </div>
            </button>
          ))}
        </div>
      </div>
    </>
  )
}
