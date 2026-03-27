import { useState, useRef, useCallback } from 'react'
import type { Tab, Space, PinnedPage } from '@shared/types'

interface SidebarMiniProps {
  spaces: Space[]
  activeSpaceId: string
  tabs: Tab[]
  pinnedPages: PinnedPage[]
  activeTabId: string | null
  onSwitchSpace: (id: string) => void
  onSwitchTab: (id: string) => void
  onClickPin: (url: string) => void
  onToggleSidebar: () => void
}

export function SidebarMini({
  spaces,
  activeSpaceId,
  tabs,
  pinnedPages,
  activeTabId,
  onSwitchSpace,
  onSwitchTab,
  onClickPin,
  onToggleSidebar,
}: SidebarMiniProps) {
  const [isPeeking, setIsPeeking] = useState(false)
  const peekTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleMouseEnter = useCallback(() => {
    peekTimeout.current = setTimeout(() => setIsPeeking(true), 300)
  }, [])

  const handleMouseLeave = useCallback(() => {
    if (peekTimeout.current) {
      clearTimeout(peekTimeout.current)
      peekTimeout.current = null
    }
    setIsPeeking(false)
  }, [])

  return (
    <div
      className="sidebar-container relative h-full flex-shrink-0"
      style={{ width: 48 }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Main mini bar */}
      <div
        className="h-full flex flex-col items-center py-3 gap-1.5"
        style={{
          width: 48,
          background: 'var(--bg-sidebar)',
          borderRight: '1px solid var(--border)',
        }}
      >
        <span className="text-[10px] font-bold mb-0.5" style={{ color: 'var(--text-primary)' }}>N</span>

        {/* Expand button */}
        <button
          onClick={onToggleSidebar}
          className="w-7 h-6 rounded-md flex items-center justify-center text-[10px] cursor-pointer hover:bg-white/10 mb-1"
          style={{ color: 'var(--text-secondary)' }}
          title="Expand sidebar (Ctrl+\)"
        >
          »
        </button>

        {/* Space dots */}
        <div className="flex gap-[3px] mb-2">
          {spaces.map(space => (
            <div
              key={space.id}
              onClick={() => onSwitchSpace(space.id)}
              className="w-1.5 h-1.5 rounded-full cursor-pointer"
              style={{
                background: space.id === activeSpaceId ? space.color : 'rgba(255,255,255,0.15)',
                transition: 'background var(--transition-fast)',
              }}
              title={space.name}
            />
          ))}
        </div>

        {/* Pinned icons */}
        {pinnedPages.map((page, i) => (
          <div
            key={i}
            onClick={() => onClickPin(page.url)}
            className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer hover:bg-white/10"
            style={{ background: 'var(--accent-subtle)' }}
            title={page.title}
          >
            {page.faviconUrl ? (
              <img src={page.faviconUrl} className="w-4 h-4 rounded-sm" alt="" />
            ) : (
              <div
                className="w-4 h-4 rounded-sm flex items-center justify-center text-[8px] font-medium"
                style={{ background: 'var(--green)', color: '#111' }}
              >
                {page.title.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        ))}

        {/* Separator */}
        {pinnedPages.length > 0 && tabs.length > 0 && (
          <div className="w-5 my-1" style={{ borderTop: '1px solid var(--border)' }} />
        )}

        {/* Tab icons */}
        {tabs.map(tab => (
          <div
            key={tab.id}
            onClick={() => onSwitchTab(tab.id)}
            className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer hover:bg-white/10"
            style={{ background: tab.id === activeTabId ? 'var(--bg-active)' : 'transparent' }}
            title={tab.title}
          >
            {tab.faviconUrl ? (
              <img src={tab.faviconUrl} className="w-4 h-4 rounded-sm" alt="" />
            ) : (
              <div
                className="w-4 h-4 rounded-sm flex items-center justify-center text-[8px] font-medium"
                style={{ background: 'var(--orange)', color: '#111' }}
              >
                {tab.title.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Peek overlay */}
      {isPeeking && (
        <div
          className="peek-overlay absolute top-0 left-12 h-full z-50 flex flex-col shadow-2xl"
          style={{
            width: 240,
            background: 'var(--bg-sidebar)',
            borderRight: '1px solid var(--border)',
            borderRadius: '0 var(--radius-md) var(--radius-md) 0',
          }}
        >
          <div className="flex items-center px-4 pt-4 pb-2">
            <span className="text-[13px] font-semibold tracking-wider" style={{ color: 'var(--text-primary)' }}>
              NSTY
            </span>
          </div>

          {/* Space switcher */}
          <div className="flex gap-1 px-3 pb-2">
            {spaces.map(space => (
              <button
                key={space.id}
                onClick={() => onSwitchSpace(space.id)}
                className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium cursor-pointer"
                style={{
                  background: space.id === activeSpaceId ? space.color : 'var(--bg-hover)',
                  color: space.id === activeSpaceId ? 'white' : 'var(--text-secondary)',
                }}
              >
                {space.name}
              </button>
            ))}
          </div>

          {/* Pinned */}
          {pinnedPages.length > 0 && (
            <div className="px-3 py-1.5">
              <div className="text-[10px] font-semibold uppercase tracking-widest px-1 pb-1.5"
                style={{ color: 'var(--text-muted)' }}>
                Pinned
              </div>
              {pinnedPages.map((page, i) => (
                <div
                  key={i}
                  onClick={() => onClickPin(page.url)}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer hover:bg-white/[0.04]"
                  style={{ background: 'var(--accent-subtle)' }}
                >
                  <div className="w-4 h-4 rounded-sm flex items-center justify-center text-[9px] font-medium"
                    style={{ background: 'var(--green)', color: '#111' }}>
                    {page.title.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs truncate" style={{ color: 'var(--text-primary)' }}>
                    {page.title}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Tabs */}
          <div className="flex-1 overflow-y-auto px-3 py-1.5">
            <div className="text-[10px] font-semibold uppercase tracking-widest px-1 pb-1.5"
              style={{ color: 'var(--text-muted)' }}>
              Tabs
            </div>
            {tabs.map(tab => (
              <div
                key={tab.id}
                onClick={() => onSwitchTab(tab.id)}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer hover:bg-white/[0.04]"
                style={{ background: tab.id === activeTabId ? 'var(--bg-active)' : 'transparent' }}
              >
                <div className="w-4 h-4 rounded-sm flex items-center justify-center text-[8px] font-medium flex-shrink-0"
                  style={{ background: 'var(--orange)', color: '#111' }}>
                  {tab.title.charAt(0).toUpperCase()}
                </div>
                <span className="text-xs truncate"
                  style={{ color: tab.id === activeTabId ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                  {tab.title}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
