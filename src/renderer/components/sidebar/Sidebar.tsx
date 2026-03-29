import { useState } from 'react'
import type { Tab, Space, PinnedPage, UserProfile, ShieldStats } from '@shared/types'
import { UserMenu } from './UserMenu'
import { HexIcon } from '../dashboard/HexIcon'
import { NavControls } from './NavControls'
import { SpaceDots } from './SpaceDots'
import { PinnedPages } from './PinnedPages'
import { TabList } from './TabList'
import { CommandBar } from './CommandBar'

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
  onNavigate: (url: string) => void
  onBack: () => void
  onForward: () => void
  onReload: () => void
  shieldCount: number
  shieldStats: ShieldStats
  shieldPopupOpen: boolean
  onToggleShieldPopup: () => void
  onCloseShieldPopup: () => void
  onDisableShieldForSite: () => void
  ai: {
    messages: { role: 'user' | 'assistant'; content: string }[]
    streamingContent: string
    isStreaming: boolean
    sendMessage: (message: string) => void
  }
  userProfile: UserProfile
}

export function Sidebar({
  spaces,
  activeSpaceId,
  activeTabId,
  isExpanded,
  onToggleExpand,
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
  onNavigate,
  onBack,
  onForward,
  onReload,
  shieldCount,
  shieldStats,
  shieldPopupOpen,
  onToggleShieldPopup,
  onCloseShieldPopup,
  onDisableShieldForSite,
  ai,
  userProfile,
}: SidebarProps) {
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const sidebarWidth = isExpanded ? 240 : 60
  const activeSpace = spaces.find(s => s.id === activeSpaceId)
  const tabs = activeSpace?.tabs ?? []
  const pinnedPages = activeSpace?.pinnedPages ?? []

  return (
    <aside
      className="fixed left-0 top-0 h-full z-40 flex flex-col flex-shrink-0 sidebar-collapse sidebar-glass"
      style={{ width: sidebarWidth }}
    >
      <div className="flex flex-col h-full">

        {/* Section 1: Header — Logo + Wordmark + Collapse Toggle */}
        <div
          className={`flex items-center ${isExpanded ? 'justify-between px-4' : 'justify-center'} pt-3 pb-1`}
          style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        >
          <div
            className={`flex items-center ${isExpanded ? 'gap-2' : ''} cursor-pointer`}
            onClick={onToggleExpand}
            title={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          >
            <HexIcon size={isExpanded ? 24 : 20} />
            {isExpanded && (
              <span
                className="font-headline text-[13px] font-bold uppercase"
                style={{ color: 'var(--primary)', letterSpacing: '0.15em' }}
              >
                nsty
              </span>
            )}
          </div>
          {isExpanded && (
            <button
              onClick={onToggleExpand}
              className="w-5 h-5 rounded flex items-center justify-center cursor-pointer transition-colors"
              style={{ color: 'var(--outline)', opacity: 0.5, WebkitAppRegion: 'no-drag' } as React.CSSProperties}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-translucent-hover)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
              aria-label="Collapse sidebar"
            >
              <span className="material-symbols-outlined text-[16px]">chevron_left</span>
            </button>
          )}
        </div>

        {/* Section 2: Command Bar */}
        <CommandBar
          onNavigate={onNavigate}
          tabs={tabs}
          onSwitchTab={onSwitchTab}
          ai={ai}
          isExpanded={isExpanded}
        />

        {/* Section 3: Navigation Controls */}
        <div className="py-1">
          <NavControls
            onBack={onBack}
            onForward={onForward}
            onReload={onReload}
            shieldCount={shieldCount}
            shieldStats={shieldStats}
            shieldPopupOpen={shieldPopupOpen}
            onToggleShieldPopup={onToggleShieldPopup}
            onCloseShieldPopup={onCloseShieldPopup}
            onDisableShieldForSite={onDisableShieldForSite}
            isExpanded={isExpanded}
          />
        </div>

        {/* Divider */}
        <div className="mx-3" style={{ height: 1, background: 'var(--border-subtle)' }} />

        {/* Section 4: Pinned Pages */}
        <PinnedPages
          pages={pinnedPages}
          onReorder={onReorderPins}
          onUnpin={onUnpin}
          onOpenInNewTab={onOpenPinInNewTab}
          onClickPin={onClickPin}
          isExpanded={isExpanded}
        />

        {pinnedPages.length > 0 && (
          <div className="mx-3" style={{ height: 1, background: 'var(--border-subtle)' }} />
        )}

        {/* Section 5: Today Tabs (scrollable, flex-1) */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <TabList
            tabs={tabs}
            activeTabId={activeTabId}
            onSwitchTab={onSwitchTab}
            onCloseTab={onCloseTab}
            onPinTab={onPinTab}
          />
        </div>

        {/* Section 6: New Tab Button */}
        <div className={`${isExpanded ? 'px-3' : 'flex justify-center'} py-1`}>
          <button
            onClick={onNewTab}
            className={`flex items-center gap-2 ${isExpanded ? 'px-2 w-full' : 'justify-center w-8 h-8'} py-1.5 rounded-lg cursor-pointer transition-colors`}
            style={{ color: 'rgba(206, 250, 5, 0.5)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-translucent-hover)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
            aria-label="New tab"
            title="New tab"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            {isExpanded && <span className="font-body text-xs">New Tab</span>}
          </button>
        </div>

        {/* Divider */}
        <div className="mx-3" style={{ height: 1, background: 'var(--border-subtle)' }} />

        {/* Section 7: Bottom Bar — Space Dots + User Avatar */}
        <div className={`flex items-center ${isExpanded ? 'justify-between px-3' : 'flex-col gap-2 items-center'} py-2.5`}>
          <SpaceDots
            spaces={spaces}
            activeSpaceId={activeSpaceId}
            onSwitchSpace={onSwitchSpace}
            isExpanded={isExpanded}
          />
          <div className="relative">
            {userMenuOpen && (
              <UserMenu
                onOpenSettings={onOpenSettings}
                onClose={() => setUserMenuOpen(false)}
              />
            )}
            <button
              onClick={() => setUserMenuOpen(prev => !prev)}
              className="cursor-pointer"
              aria-label={`User menu for ${userProfile.name}`}
              aria-expanded={userMenuOpen}
              title={userProfile.name}
            >
              <div
                className="w-[26px] h-[26px] rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center"
                style={{ background: 'var(--surface-translucent-active)', border: '1px solid var(--border-active)' }}
              >
                {userProfile.avatarUrl ? (
                  <img src={userProfile.avatarUrl} className="w-full h-full object-cover" alt={userProfile.name} />
                ) : (
                  <span className="font-headline text-[10px] font-bold" style={{ color: 'var(--primary)' }}>
                    {userProfile.name?.charAt(0)?.toUpperCase() || '?'}
                  </span>
                )}
              </div>
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}
