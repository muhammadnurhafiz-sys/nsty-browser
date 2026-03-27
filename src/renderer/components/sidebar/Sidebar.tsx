import type { Tab, Space } from '@shared/types'

interface SidebarProps {
  spaces: Space[]
  activeSpaceId: string
  activeTabId: string | null
  expanded: boolean
  onSwitchSpace: (spaceId: string) => void
  onSwitchTab: (tabId: string) => void
  onCloseTab: (tabId: string) => void
  onNewTab: () => void
}

export function Sidebar({
  spaces,
  activeSpaceId,
  activeTabId,
  expanded,
  onSwitchSpace,
  onSwitchTab,
  onCloseTab,
  onNewTab,
}: SidebarProps) {
  const activeSpace = spaces.find(s => s.id === activeSpaceId)
  const tabs = activeSpace?.tabs ?? []
  const pinnedPages = activeSpace?.pinnedPages ?? []

  if (!expanded) {
    return <SidebarMini
      spaces={spaces}
      activeSpaceId={activeSpaceId}
      tabs={tabs}
      pinnedPages={pinnedPages}
      onSwitchSpace={onSwitchSpace}
      onSwitchTab={onSwitchTab}
    />
  }

  return (
    <div
      className="h-full flex flex-col flex-shrink-0"
      style={{
        width: 240,
        background: 'var(--bg-sidebar)',
        borderRight: '1px solid var(--border)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 pt-3 pb-2">
        <span className="text-[13px] font-semibold tracking-wider" style={{ color: 'var(--text-primary)' }}>
          NSTY
        </span>
        <div className="flex gap-1.5">
          <button
            onClick={onNewTab}
            className="w-5 h-5 rounded flex items-center justify-center text-xs cursor-pointer"
            style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}
          >
            +
          </button>
          <button
            className="w-5 h-5 rounded flex items-center justify-center text-[10px] cursor-pointer"
            style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}
          >
            ⚙
          </button>
        </div>
      </div>

      {/* Space Switcher */}
      <div className="flex gap-1 px-2.5 pb-2">
        {spaces.map(space => (
          <button
            key={space.id}
            onClick={() => onSwitchSpace(space.id)}
            className="px-2.5 py-1 rounded-md text-[11px] font-medium cursor-pointer"
            style={{
              background: space.id === activeSpaceId ? space.color : 'var(--bg-hover)',
              color: space.id === activeSpaceId ? 'white' : 'var(--text-secondary)',
            }}
          >
            {space.name}
          </button>
        ))}
      </div>

      {/* Pinned Pages */}
      {pinnedPages.length > 0 && (
        <div className="px-2.5 py-1.5">
          <div
            className="text-[10px] font-semibold uppercase tracking-widest px-1 pb-1.5"
            style={{ color: 'var(--text-muted)' }}
          >
            📌 Pinned
          </div>
          <div className="flex flex-col gap-0.5">
            {pinnedPages.map((page, i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer"
                style={{ background: 'rgba(124,58,237,0.15)' }}
              >
                <div
                  className="w-4 h-4 rounded-sm flex items-center justify-center text-[9px]"
                  style={{ background: 'var(--green)' }}
                >
                  {page.title.charAt(0).toUpperCase()}
                </div>
                <span className="text-xs truncate" style={{ color: 'var(--text-primary)' }}>
                  {page.title}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Tabs */}
      <div className="flex-1 overflow-y-auto px-2.5 py-1.5">
        <div
          className="text-[10px] font-semibold uppercase tracking-widest px-1 pb-1.5"
          style={{ color: 'var(--text-muted)' }}
        >
          Today
        </div>
        <div className="flex flex-col gap-0.5">
          {tabs.map(tab => (
            <div
              key={tab.id}
              onClick={() => onSwitchTab(tab.id)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer group"
              style={{
                background: tab.id === activeTabId ? 'rgba(255,255,255,0.08)' : 'transparent',
              }}
            >
              <div
                className="w-4 h-4 rounded-sm flex items-center justify-center text-[8px] flex-shrink-0"
                style={{ background: 'var(--orange)' }}
              >
                {tab.title.charAt(0).toUpperCase()}
              </div>
              <span
                className="text-xs truncate flex-1"
                style={{ color: tab.id === activeTabId ? 'var(--text-primary)' : 'var(--text-secondary)' }}
              >
                {tab.title}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); onCloseTab(tab.id) }}
                className="hidden group-hover:flex w-4 h-4 rounded items-center justify-center text-[10px] cursor-pointer"
                style={{ color: 'var(--text-muted)' }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div
        className="flex items-center gap-2 px-2.5 py-2"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold"
          style={{ background: 'var(--accent)', color: 'white' }}
        >
          H
        </div>
        <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>Hafiz</span>
      </div>
    </div>
  )
}

// Minimized sidebar
function SidebarMini({
  spaces,
  activeSpaceId,
  tabs,
  pinnedPages,
  onSwitchSpace,
  onSwitchTab,
}: {
  spaces: Space[]
  activeSpaceId: string
  tabs: Tab[]
  pinnedPages: { title: string; faviconUrl: string }[]
  onSwitchSpace: (id: string) => void
  onSwitchTab: (id: string) => void
}) {
  return (
    <div
      className="h-full flex flex-col items-center py-2.5 gap-1 flex-shrink-0"
      style={{
        width: 48,
        background: 'var(--bg-sidebar)',
        borderRight: '1px solid var(--border)',
      }}
    >
      <span className="text-[10px] font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>N</span>

      {/* Space dots */}
      <div className="flex gap-[3px] mb-2">
        {spaces.map(space => (
          <div
            key={space.id}
            onClick={() => onSwitchSpace(space.id)}
            className="w-1.5 h-1.5 rounded-full cursor-pointer"
            style={{
              background: space.id === activeSpaceId ? space.color : 'rgba(255,255,255,0.15)',
            }}
          />
        ))}
      </div>

      {/* Pinned icons */}
      {pinnedPages.map((page, i) => (
        <div
          key={i}
          className="w-7 h-7 rounded-md flex items-center justify-center cursor-pointer"
          style={{ background: 'rgba(124,58,237,0.15)' }}
          title={page.title}
        >
          <div
            className="w-4 h-4 rounded-sm flex items-center justify-center text-[8px]"
            style={{ background: 'var(--green)' }}
          >
            {page.title.charAt(0).toUpperCase()}
          </div>
        </div>
      ))}

      {/* Separator */}
      <div className="w-5 my-1" style={{ borderTop: '1px solid var(--border)' }} />

      {/* Tab icons */}
      {tabs.map(tab => (
        <div
          key={tab.id}
          onClick={() => onSwitchTab(tab.id)}
          className="w-7 h-7 rounded-md flex items-center justify-center cursor-pointer"
          style={{ background: tab.isActive ? 'rgba(255,255,255,0.08)' : 'transparent' }}
          title={tab.title}
        >
          <div
            className="w-4 h-4 rounded-sm flex items-center justify-center text-[8px]"
            style={{ background: 'var(--orange)' }}
          >
            {tab.title.charAt(0).toUpperCase()}
          </div>
        </div>
      ))}
    </div>
  )
}
