import { useState } from 'react'
import type { Tab, Space, PinnedPage, UserProfile } from '@shared/types'
import { UserMenu } from './UserMenu'

interface SidebarProps {
  spaces: Space[]
  activeSpaceId: string
  activeTabId: string | null
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
  onNewTab,
  onOpenSettings,
  onOpenHistory,
  onToggleTabDrawer,
  userProfile,
}: SidebarProps) {
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [activeNav, setActiveNav] = useState('tabs')

  const navItems: NavItem[] = [
    { id: 'tabs', icon: 'grid_view', label: 'Tabs', action: onToggleTabDrawer },
    { id: 'pins', icon: 'push_pin', label: 'Pinned', action: () => setActiveNav('pins') },
    { id: 'history', icon: 'history', label: 'History', action: onOpenHistory },
    { id: 'extensions', icon: 'extension', label: 'Extensions', action: () => setActiveNav('extensions') },
    { id: 'settings', icon: 'settings', label: 'Settings', action: onOpenSettings },
  ]

  return (
    <aside
      className="fixed left-0 top-0 h-full z-40 flex flex-col flex-shrink-0"
      style={{
        width: 80,
        background: 'var(--surface-container-low)',
      }}
    >
      <div className="flex flex-col items-center gap-8 h-full py-6">
        {/* Logo */}
        <div className="flex flex-col items-center mb-2">
          <span
            className="font-headline text-xl font-bold tracking-tighter"
            style={{ color: 'var(--primary)' }}
          >
            N
          </span>
          <span
            className="font-label text-[0.5rem] tracking-widest uppercase"
            style={{ color: 'var(--primary)', opacity: 0.6 }}
          >
            nsty
          </span>
        </div>

        {/* New Tab button */}
        <button
          onClick={onNewTab}
          className="flex items-center justify-center w-10 h-10 rounded-xl cursor-pointer transition-all duration-200"
          style={{
            background: 'rgba(206, 250, 5, 0.1)',
            color: 'var(--primary)',
          }}
          title="New tab (Ctrl+T)"
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
        </button>

        {/* Nav Icons */}
        <nav className="flex flex-col gap-4 flex-grow">
          {navItems.map((item) => {
            const isActive = activeNav === item.id
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveNav(item.id)
                  item.action()
                }}
                className="relative flex items-center justify-center w-10 h-10 rounded-xl cursor-pointer transition-all duration-300"
                style={{
                  color: isActive ? 'var(--primary)' : 'var(--outline)',
                  opacity: isActive ? 1 : 0.6,
                  background: isActive ? 'rgba(206, 250, 5, 0.08)' : 'transparent',
                }}
                title={item.label}
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
              </button>
            )
          })}
        </nav>

        {/* Bottom actions */}
        <div className="flex flex-col gap-4 mt-auto pb-2 items-center">
          <button
            className="flex items-center justify-center w-10 h-10 rounded-xl cursor-pointer transition-colors"
            style={{ color: 'var(--outline)', opacity: 0.6 }}
            title="Help"
          >
            <span className="material-symbols-outlined text-[20px]">help_outline</span>
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
              className="w-9 h-9 rounded-full overflow-hidden cursor-pointer"
              style={{
                border: '2px solid rgba(73, 72, 71, 0.2)',
              }}
              title={userProfile.name}
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
                  {userProfile.name.charAt(0).toUpperCase()}
                </div>
              )}
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}
