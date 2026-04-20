import { useState, useEffect, useRef } from 'react'
import { useFocusTrap } from '../../hooks/useFocusTrap'
import { createLogger } from '../../utils/logger'

const log = createLogger('HistoryPanel')

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
  log.debug('render', { isOpen })
  const [query, setQuery] = useState('')
  const [entries, _setEntries] = useState<HistoryEntry[]>([])
  const panelRef = useRef<HTMLDivElement>(null)

  useFocusTrap(panelRef, isOpen)

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
        className="fixed inset-0 z-[var(--z-backdrop)] fade-in"
        style={{ background: 'var(--surface-overlay-dim)' }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[var(--z-drawer)] max-h-[70vh] rounded-xl flex flex-col shadow-2xl fade-in"
        style={{
          width: 'min(560px, calc(100vw - 120px))',
          background: 'var(--surface-translucent)',
          backdropFilter: 'blur(30px)',
          WebkitBackdropFilter: 'blur(30px)',
          border: '1px solid var(--border-subtle)',
          padding: 'var(--menu-pad)',
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Search history"
        onKeyDown={handleKeyDown}
      >
        {/* Search header */}
        <div
          className="flex items-center gap-3"
          style={{ padding: 'var(--menu-item-pad-y) var(--menu-item-pad-x)' }}
        >
          <span className="material-symbols-outlined text-[18px]" style={{ color: 'var(--on-surface-variant)' }}>search</span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search history..."
            aria-label="Search history"
            className="flex-1 bg-transparent outline-none font-body text-sm"
            style={{ color: 'var(--on-surface)' }}
          />
          <button type="button"
            onClick={onClose}
            aria-label="Close history"
            className="font-label text-[10px] uppercase cursor-pointer flex-shrink-0"
            style={{
              background: 'var(--surface-translucent-hover)',
              color: 'var(--on-surface-variant)',
              border: '1px solid var(--border-subtle)',
              letterSpacing: '0.1em',
              padding: '3px 8px',
              borderRadius: 6,
            }}
          >
            ESC
          </button>
        </div>

        <hr className="menu-separator" />

        {/* Results */}
        <div
          className="flex-1 overflow-y-auto flex flex-col"
          style={{ gap: 'var(--menu-gap)' }}
        >
          {entries.length === 0 && (
            query ? (
              <div className="px-3 py-6">
                <p
                  className="font-body text-[11px]"
                  style={{ color: 'var(--on-surface-variant)' }}
                >
                  No matches for <span className="font-mono" style={{ color: 'var(--on-surface)' }}>"{query}"</span>.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-1 px-3 py-4">
                {[
                  'No entries yet in this space',
                  'Private windows are not recorded',
                  'Syncs locally only',
                ].map(line => (
                  <div
                    key={line}
                    className="flex items-center gap-2.5 py-1.5 font-body text-[11px]"
                    style={{ color: 'var(--on-surface-variant)' }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: '50%',
                        background: 'var(--outline)',
                        flexShrink: 0,
                      }}
                    />
                    {line}
                  </div>
                ))}
                <div
                  className="flex items-center gap-2 mt-3 pt-3 font-label text-[10px] uppercase"
                  style={{
                    borderTop: '1px solid var(--border-subtle)',
                    color: 'var(--outline)',
                    letterSpacing: '0.12em',
                  }}
                >
                  Press
                  <kbd
                    className="font-mono text-[10px] normal-case"
                    style={{
                      background: 'var(--surface-container-highest)',
                      color: 'var(--on-surface)',
                      padding: '2px 6px',
                      borderRadius: 4,
                      letterSpacing: 0,
                    }}
                  >
                    Esc
                  </kbd>
                  to close
                </div>
              </div>
            )
          )}

          {entries.map(entry => (
            <button type="button"
              key={entry.id}
              onClick={() => { onNavigate(entry.url); onClose() }}
              className="menu-item font-body text-xs"
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
                <div className="truncate" style={{ color: 'var(--on-surface)' }}>
                  {entry.title || entry.url}
                </div>
                <div className="font-body text-[10px] truncate" style={{ color: 'var(--outline)' }}>
                  {entry.url}
                </div>
              </div>
              {entry.visit_count > 1 && (
                <div className="font-mono text-[10px] flex-shrink-0 tabular-nums" style={{ color: 'var(--outline)' }}>
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
