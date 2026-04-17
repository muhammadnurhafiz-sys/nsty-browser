import { useState, useEffect } from 'react'

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
  const [entries, _setEntries] = useState<HistoryEntry[]>([])

  // Search history when query changes
  useEffect(() => {
    if (!isOpen) return
    // TODO: Wire to IPC for actual SQLite search
  }, [isOpen])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 fade-in"
        style={{ background: 'var(--surface-overlay-dim)' }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 max-h-[70vh] rounded-xl flex flex-col shadow-2xl fade-in"
        style={{
          width: 'min(560px, calc(100vw - 120px))',
          background: 'rgba(206, 250, 5, 0.03)',
          backdropFilter: 'blur(30px)',
          WebkitBackdropFilter: 'blur(30px)',
          border: '1px solid var(--border-subtle)',
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Search history"
        onKeyDown={handleKeyDown}
      >
        {/* Search header */}
        <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <span className="material-symbols-outlined text-[18px]" style={{ color: 'rgba(206, 250, 5, 0.5)' }}>search</span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search history..."
            aria-label="Search history"
            className="flex-1 bg-transparent outline-none font-body text-sm"
            style={{ color: 'var(--on-surface)' }}
          />
          <button
            onClick={onClose}
            aria-label="Close history"
            className="font-label text-[10px] uppercase tracking-wider px-2 py-1 rounded-md cursor-pointer"
            style={{
              background: 'var(--surface-translucent-hover)',
              color: 'rgba(206, 250, 5, 0.4)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            ESC
          </button>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {entries.length === 0 && (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <span
                  className="material-symbols-outlined mb-2 block"
                  style={{ fontSize: 28, color: 'var(--outline)', opacity: 0.4 }}
                >
                  history
                </span>
                <p className="font-body text-xs" style={{ color: 'var(--outline)' }}>
                  {query ? 'No matching history entries' : 'Browse history will appear here'}
                </p>
              </div>
            </div>
          )}

          {entries.map(entry => (
            <button
              key={entry.id}
              onClick={() => { onNavigate(entry.url); onClose() }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-left transition-colors"
              style={{ background: 'transparent' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-translucent-hover)' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              {entry.favicon_url ? (
                <img src={entry.favicon_url} className="w-4 h-4 rounded-sm flex-shrink-0" alt={`${entry.title || entry.url} favicon`} />
              ) : (
                <div
                  className="w-4 h-4 rounded-sm flex items-center justify-center text-[8px] font-bold flex-shrink-0"
                  style={{ background: 'var(--surface-container-highest)', color: 'var(--primary)' }}
                >
                  {(entry.title || entry.url).charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-body text-xs truncate" style={{ color: 'var(--on-surface)' }}>
                  {entry.title || entry.url}
                </div>
                <div className="font-body text-[10px] truncate" style={{ color: 'var(--outline)' }}>
                  {entry.url}
                </div>
              </div>
              {entry.visit_count > 1 && (
                <div className="font-label text-[10px] flex-shrink-0" style={{ color: 'var(--outline)' }}>
                  {entry.visit_count}x
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </>
  )
}
