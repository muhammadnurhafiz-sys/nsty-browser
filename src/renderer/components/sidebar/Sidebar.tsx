import { useState } from 'react'
import type { Tab, Space, PinnedPage, UserProfile } from '@shared/types'
import { SpaceSwitcher } from './SpaceSwitcher'
import { PinnedPages } from './PinnedPages'
import { TabList } from './TabList'
import { SidebarMini } from './SidebarMini'
import { UserMenu } from './UserMenu'

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
  onOpenSettings: () => void
  onToggleSidebar: () => void
  userProfile: UserProfile
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
  onOpenSettings,
  onToggleSidebar,
  userProfile,
}: SidebarProps) {
  const [userMenuOpen, setUserMenuOpen] = useState(false)
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
        onToggleSidebar={onToggleSidebar}
      />
    )
  }

  return (
    <div
      className="sidebar-container h-full flex flex-col flex-shrink-0"
      style={{
        width: 240,
        background: 'var(--bg-sidebar)',
        borderRight: '1px solid var(--border)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <span className="text-[13px] font-semibold tracking-wider" style={{ color: 'var(--text-primary)' }}>
          NSTY
        </span>
        <div className="flex gap-1">
          <button
            onClick={onNewTab}
            className="w-6 h-6 rounded-md flex items-center justify-center text-xs cursor-pointer hover:bg-white/10"
            style={{ color: 'var(--text-secondary)' }}
            title="New tab (Ctrl+T)"
          >
            +
          </button>
          <button
            onClick={onOpenSettings}
            className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] cursor-pointer hover:bg-white/10"
            style={{ color: 'var(--text-secondary)' }}
            title="Settings"
          >
            ⚙
          </button>
          <button
            onClick={onToggleSidebar}
            className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] cursor-pointer hover:bg-white/10"
            style={{ color: 'var(--text-secondary)' }}
            title="Collapse sidebar (Ctrl+\)"
          >
            «
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

      {/* Footer — User Profile */}
      <div className="relative" style={{ borderTop: '1px solid var(--border)' }}>
        {userMenuOpen && (
          <UserMenu
            onOpenSettings={onOpenSettings}
            onClose={() => setUserMenuOpen(false)}
          />
        )}
        <div
          className="flex items-center gap-2.5 px-3 py-2.5 cursor-pointer hover:bg-white/[0.04]"
          onClick={() => setUserMenuOpen(prev => !prev)}
        >
          {userProfile.avatarUrl ? (
            <img
              src={userProfile.avatarUrl}
              className="w-7 h-7 rounded-full object-cover"
              alt={userProfile.name}
            />
          ) : (
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold"
              style={{ background: 'var(--accent)', color: 'white' }}
            >
              {userProfile.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex flex-col min-w-0">
            <span className="text-[12px] font-medium truncate" style={{ color: 'var(--text-secondary)' }}>
              {userProfile.name}
            </span>
            {userProfile.provider === 'google' && (
              <span className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>
                {userProfile.email}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
