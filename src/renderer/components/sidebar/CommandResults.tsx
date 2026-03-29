import type { Tab } from '@shared/types'

interface CommandResultsProps {
  tabs: Tab[]
  query: string
  onSwitchTab: (tabId: string) => void
}

export function CommandResults({ tabs, query, onSwitchTab }: CommandResultsProps) {
  if (!query.trim()) return null

  const lower = query.toLowerCase()
  const matches = tabs
    .filter(t => t.title.toLowerCase().includes(lower) || t.url.toLowerCase().includes(lower))
    .slice(0, 8)

  if (matches.length === 0) return null

  return (
    <div className="overflow-y-auto hide-scrollbar expand-down" style={{ maxHeight: '40vh' }}>
      <div
        className="font-label text-[9px] uppercase px-4 py-1"
        style={{ color: 'rgba(206, 250, 5, 0.3)', letterSpacing: '0.1em' }}
      >
        Open Tabs
      </div>
      {matches.map(tab => (
        <button
          key={tab.id}
          onClick={() => onSwitchTab(tab.id)}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg cursor-pointer transition-colors text-left hover-surface"
        >
          {tab.faviconUrl ? (
            <img src={tab.faviconUrl} className="w-3.5 h-3.5 rounded-sm flex-shrink-0" alt="" />
          ) : (
            <div
              className="w-3.5 h-3.5 rounded-sm flex items-center justify-center text-[7px] font-bold flex-shrink-0"
              style={{ background: 'rgba(255, 255, 255, 0.1)', color: 'var(--on-surface-variant)' }}
            >
              {tab.title.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="font-body text-[11px] truncate" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
              {tab.title}
            </div>
            <div className="font-body text-[9px] truncate" style={{ color: 'rgba(255, 255, 255, 0.3)' }}>
              {tab.url}
            </div>
          </div>
        </button>
      ))}
    </div>
  )
}
