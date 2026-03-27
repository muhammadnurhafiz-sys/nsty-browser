import type { Tab, Space, PinnedPage } from '@shared/types'
import { SpaceSwitcher } from './SpaceSwitcher'
import { PinnedPages } from './PinnedPages'
import { TabList } from './TabList'
import { SidebarMini } from './SidebarMini'

interface SidebarProps {
  spaces: Space[]
  activeSpaceId: string
  activeTabId: string | null
  expanded: boolean
  onSwitchSpace: (spaceId: string) => void
  onSwitchTab: (tabId: string) => void
  onCloseTab: (tabId: string) => void
  onNewTab: () => void
  onPinTab: (tab: Tab) => void
  onUnpin: (url: string) => void
  onReorderPins: (pages: PinnedPage[]) => void
  onClickPin: (url: string) => void
  onOpenPinInNewTab: (url: string) => void
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
  onPinTab,
  onUnpin,
  onReorderPins,
  onClickPin,
  onOpenPinInNewTab,
}: SidebarProps) {
  const activeSpace = spaces.find(s => s.id === activeSpaceId)
  const tabs = activeSpace?.tabs ?? []
  const pinnedPages = activeSpace?.pinnedPages ?? []

  if (!expanded) {
    return (
      <SidebarMini
        spaces={spaces}
        activeSpaceId={activeSpaceId}
        tabs={tabs}
        pinnedPages={pinnedPages}
        activeTabId={activeTabId}
        onSwitchSpace={onSwitchSpace}
        onSwitchTab={onSwitchTab}
        onClickPin={onClickPin}
      />
    )
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
            className="w-5 h-5 rounded flex items-center justify-center text-xs cursor-pointer hover:bg-white/10"
            style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}
            title="New tab (Ctrl+T)"
          >
            +
          </button>
          <button
            className="w-5 h-5 rounded flex items-center justify-center text-[10px] cursor-pointer hover:bg-white/10"
            style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}
            title="Settings"
          >
            ⚙
          </button>
        </div>
      </div>

      {/* Space Switcher */}
      <SpaceSwitcher
        spaces={spaces}
        activeSpaceId={activeSpaceId}
        onSwitchSpace={onSwitchSpace}
      />

      {/* Pinned Pages */}
      <PinnedPages
        pages={pinnedPages}
        onReorder={onReorderPins}
        onUnpin={onUnpin}
        onOpenInNewTab={onOpenPinInNewTab}
        onClickPin={onClickPin}
      />

      {/* Tab List */}
      <TabList
        tabs={tabs}
        activeTabId={activeTabId}
        onSwitchTab={onSwitchTab}
        onCloseTab={onCloseTab}
        onPinTab={onPinTab}
      />

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
