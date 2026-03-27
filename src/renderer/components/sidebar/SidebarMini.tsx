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
      className="relative h-full flex-shrink-0"
      style={{ width: 48 }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Main mini bar */}
      <div
        className="h-full flex flex-col items-center py-2.5 gap-1"
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
              className="w-1.5 h-1.5 rounded-full cursor-pointer transition-colors"
              style={{
                background: space.id === activeSpaceId ? space.color : 'rgba(255,255,255,0.15)',
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
            className="w-7 h-7 rounded-md flex items-center justify-center cursor-pointer hover:bg-white/10 transition-colors"
            style={{ background: 'rgba(124,58,237,0.15)' }}
            title={page.title}
          >
            {page.faviconUrl ? (
              <img src={page.faviconUrl} className="w-4 h-4 rounded-sm" alt="" />
            ) : (
              <div
                className="w-4 h-4 rounded-sm flex items-center justify-center text-[8px]"
                style={{ background: 'var(--green)' }}
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
            className="w-7 h-7 rounded-md flex items-center justify-center cursor-pointer hover:bg-white/10 transition-colors"
            style={{ background: tab.id === activeTabId ? 'rgba(255,255,255,0.08)' : 'transparent' }}
            title={tab.title}
          >
            {tab.faviconUrl ? (
              <img src={tab.faviconUrl} className="w-4 h-4 rounded-sm" alt="" />
            ) : (
              <div
                className="w-4 h-4 rounded-sm flex items-center justify-center text-[8px]"
                style={{ background: 'var(--orange)' }}
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
          className="absolute top-0 left-12 h-full z-50 flex flex-col shadow-2xl"
          style={{
            width: 240,
            background: 'var(--bg-sidebar)',
            borderRight: '1px solid var(--border)',
            borderRadius: '0 8px 8px 0',
          }}
        >
          <div className="flex items-center px-3.5 pt-3 pb-2">
            <span className="text-[13px] font-semibold tracking-wider" style={{ color: 'var(--text-primary)' }}>
              NSTY
            </span>
          </div>

          {/* Space switcher */}
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

          {/* Pinned */}
          {pinnedPages.length > 0 && (
            <div className="px-2.5 py-1.5">
              <div className="text-[10px] font-semibold uppercase tracking-widest px-1 pb-1.5"
                style={{ color: 'var(--text-muted)' }}>
                📌 Pinned
              </div>
              {pinnedPages.map((page, i) => (
                <div
                  key={i}
                  onClick={() => onClickPin(page.url)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer"
                  style={{ background: 'rgba(124,58,237,0.15)' }}
                >
                  <div className="w-4 h-4 rounded-sm flex items-center justify-center text-[9px]"
                    style={{ background: 'var(--green)' }}>
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
          <div className="flex-1 overflow-y-auto px-2.5 py-1.5">
            <div className="text-[10px] font-semibold uppercase tracking-widest px-1 pb-1.5"
              style={{ color: 'var(--text-muted)' }}>
              Tabs
            </div>
            {tabs.map(tab => (
              <div
                key={tab.id}
                onClick={() => onSwitchTab(tab.id)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer"
                style={{ background: tab.id === activeTabId ? 'rgba(255,255,255,0.08)' : 'transparent' }}
              >
                <div className="w-4 h-4 rounded-sm flex items-center justify-center text-[8px] flex-shrink-0"
                  style={{ background: 'var(--orange)' }}>
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
