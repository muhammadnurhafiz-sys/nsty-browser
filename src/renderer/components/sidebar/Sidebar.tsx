import { useState } from 'react'
import type { Tab, Space, PinnedPage, UserProfile } from '@shared/types'
import { UserMenu } from './UserMenu'
import { HexIcon } from '../dashboard/HexIcon'

interface SidebarProps {
  spaces: Space[]
  activeSpaceId: string
  activeTabId: string | null
  isExpanded: boolean
  onToggleExpand: () => void
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
  onOpenHistory: () => void
  onToggleTabDrawer: () => void
  userProfile: UserProfile
}

type NavItem = {
  id: string
  icon: string
  label: string
  action: () => void
}

export function Sidebar({
  isExpanded,
  onToggleExpand,
  onNewTab,
  onOpenSettings,
  onOpenHistory,
  onToggleTabDrawer,
  userProfile,
}: SidebarProps) {
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [activeNav, setActiveNav] = useState('tabs')

  const sidebarWidth = isExpanded ? 240 : 60

  const navItems: NavItem[] = [
    { id: 'tabs', icon: 'grid_view', label: 'Tabs', action: onToggleTabDrawer },
    { id: 'pins', icon: 'push_pin', label: 'Pinned', action: () => setActiveNav('pins') },
    { id: 'history', icon: 'history', label: 'History', action: onOpenHistory },
    { id: 'extensions', icon: 'extension', label: 'Extensions', action: () => setActiveNav('extensions') },
    { id: 'settings', icon: 'settings', label: 'Settings', action: onOpenSettings },
  ]

  return (
    <aside
      className="fixed left-0 top-0 h-full z-40 flex flex-col flex-shrink-0 sidebar-collapse"
      style={{
        width: sidebarWidth,
        background: 'var(--surface-container-low)',
      }}
    >
      <div className={`flex flex-col h-full py-6 ${isExpanded ? 'px-4' : 'items-center'}`} style={{ gap: 24 }}>
        {/* Logo */}
        <div
          className={`flex items-center ${isExpanded ? 'gap-3 px-2' : 'flex-col'} mb-1 cursor-pointer`}
          onClick={onToggleExpand}
          title={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          <HexIcon size={isExpanded ? 28 : 24} />
          {isExpanded && (
            <span
              className="font-headline text-base font-bold tracking-tighter whitespace-nowrap"
              style={{ color: 'var(--primary)' }}
            >
              nsty
            </span>
          )}
        </div>

        {/* New Tab button */}
        <button
          onClick={onNewTab}
          className={`flex items-center ${isExpanded ? 'gap-3 px-3 w-full' : 'justify-center w-10 h-10'} rounded-xl cursor-pointer transition-all duration-200`}
          style={{
            background: 'rgba(206, 250, 5, 0.1)',
            color: 'var(--primary)',
            height: isExpanded ? 40 : undefined,
          }}
          title="New tab (Ctrl+T)"
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
          {isExpanded && (
            <span className="font-body text-sm whitespace-nowrap">New Tab</span>
          )}
        </button>

        {/* Nav Icons */}
        <nav className="flex flex-col gap-1 flex-grow">
          {navItems.map((item) => {
            const isActive = activeNav === item.id
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveNav(item.id)
                  item.action()
                }}
                className={`relative flex items-center ${isExpanded ? 'gap-3 px-3 w-full' : 'justify-center w-10 h-10'} rounded-xl cursor-pointer transition-all duration-300`}
                style={{
                  color: isActive ? 'var(--primary)' : 'var(--outline)',
                  opacity: isActive ? 1 : 0.6,
                  background: isActive ? 'rgba(206, 250, 5, 0.08)' : 'transparent',
                  height: isExpanded ? 40 : undefined,
                }}
                title={isExpanded ? undefined : item.label}
              >
                {/* Active glow bar */}
                {isActive && (
                  <span
                    className="absolute left-0 w-[3px] h-7 rounded-r-full"
                    style={{
                      background: 'var(--primary)',
                      boxShadow: '0 0 10px var(--primary)',
                    }}
                  />
                )}
                <span className="material-symbols-outlined text-[22px]">{item.icon}</span>
                {isExpanded && (
                  <span className="font-body text-sm whitespace-nowrap">{item.label}</span>
                )}
              </button>
            )
          })}
        </nav>

        {/* Bottom actions */}
        <div className={`flex flex-col gap-3 mt-auto pb-2 ${isExpanded ? '' : 'items-center'}`}>
          {/* Collapse/Expand toggle */}
          <button
            onClick={onToggleExpand}
            className={`flex items-center ${isExpanded ? 'gap-3 px-3 w-full' : 'justify-center w-10 h-10'} rounded-xl cursor-pointer transition-colors`}
            style={{ color: 'var(--outline)', opacity: 0.6, height: isExpanded ? 36 : undefined }}
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            <span className="material-symbols-outlined text-[20px]">
              {isExpanded ? 'chevron_left' : 'chevron_right'}
            </span>
            {isExpanded && (
              <span className="font-body text-sm whitespace-nowrap">Collapse</span>
            )}
          </button>

          {/* User avatar */}
          <div className="relative">
            {userMenuOpen && (
              <UserMenu
                onOpenSettings={onOpenSettings}
                onClose={() => setUserMenuOpen(false)}
              />
            )}
            <button
              onClick={() => setUserMenuOpen(prev => !prev)}
              className={`flex items-center ${isExpanded ? 'gap-3 px-2 w-full' : ''} cursor-pointer`}
              title={userProfile.name}
            >
              <div
                className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0"
                style={{ border: '2px solid rgba(73, 72, 71, 0.2)' }}
              >
                {userProfile.avatarUrl ? (
                  <img
                    src={userProfile.avatarUrl}
                    className="w-full h-full object-cover"
                    alt={userProfile.name}
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center font-headline text-[11px] font-bold"
                    style={{
                      background: 'var(--surface-container-highest)',
                      color: 'var(--primary)',
                    }}
                  >
                    {userProfile.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                )}
              </div>
              {isExpanded && (
                <div className="flex flex-col text-left">
                  <span className="font-body text-sm truncate" style={{ color: 'var(--on-surface)', maxWidth: 140 }}>
                    {userProfile.name}
                  </span>
                  <span className="font-body text-xs truncate" style={{ color: 'var(--outline)', maxWidth: 140 }}>
                    {userProfile.email}
                  </span>
                </div>
              )}
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}
