import { useState } from 'react'
import type { Tab, Space, PinnedPage, UserProfile } from '@shared/types'
import { UserMenu } from './UserMenu'
import { HexIcon } from '../dashboard/HexIcon'
import { SpaceDots } from './SpaceDots'
import { PinnedPages } from './PinnedPages'
import { TabList } from './TabList'
import { createLogger } from '../../utils/logger'

const log = createLogger('Sidebar')

interface SidebarProps {
  spaces: Space[]
  activeSpaceId: string
  activeTabId: string | null
  isExpanded: boolean
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
  userProfile: UserProfile
}

export function Sidebar({
  spaces,
  activeSpaceId,
  activeTabId,
  isExpanded,
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
  userProfile,
}: SidebarProps) {
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  log.debug('render', { isExpanded, activeSpaceId, userMenuOpen })

  const sidebarWidth = isExpanded ? 240 : 60
  const activeSpace = spaces.find(s => s.id === activeSpaceId)
  const tabs = activeSpace?.tabs ?? []
  const pinnedPages = activeSpace?.pinnedPages ?? []

  return (
    <nav
      aria-label="Workspaces and tabs"
      className="h-full flex flex-col flex-shrink-0 sidebar-collapse sidebar-glass"
      style={{ width: sidebarWidth }}
    >
      <div className={`flex items-center ${isExpanded ? 'px-4' : 'justify-center'} pt-3 pb-2`}>
        <div className="flex items-center gap-2">
          <HexIcon size={isExpanded ? 22 : 20} />
          {isExpanded && (
            <span
              className="font-headline text-[13px] font-bold uppercase"
              style={{ color: 'var(--primary)', letterSpacing: '0.15em' }}
            >
              nsty
            </span>
          )}
        </div>
      </div>

      <div className={`flex ${isExpanded ? 'px-3 justify-start' : 'justify-center'} pb-2`}>
        <SpaceDots
          spaces={spaces}
          activeSpaceId={activeSpaceId}
          onSwitchSpace={onSwitchSpace}
        />
      </div>

      <div className="mx-3" style={{ height: 1, background: 'var(--border-subtle)' }} />

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

      <div className="flex-1 min-h-0 overflow-hidden">
        <TabList
          tabs={tabs}
          activeTabId={activeTabId}
          onSwitchTab={onSwitchTab}
          onCloseTab={onCloseTab}
          onPinTab={onPinTab}
        />
      </div>

      <div className={`${isExpanded ? 'px-3' : 'flex justify-center'} py-1`}>
        <button
          type="button"
          onClick={onNewTab}
          className={`flex items-center gap-2 ${isExpanded ? 'px-2 w-full' : 'justify-center w-8 h-8'} py-1.5 rounded-lg cursor-pointer transition-colors hover-surface`}
          style={{ color: 'rgba(var(--primary-rgb), 0.55)' }}
          aria-label="New tab"
          title="New tab"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          {isExpanded && <span className="font-body text-xs">New Tab</span>}
        </button>
      </div>

      <div className="mx-3" style={{ height: 1, background: 'var(--border-subtle)' }} />

      <div className={`flex items-center ${isExpanded ? 'justify-end px-3' : 'justify-center'} pt-3 pb-4`}>
        <div className="relative">
          {userMenuOpen && (
            <UserMenu
              onOpenSettings={onOpenSettings}
              onClose={() => setUserMenuOpen(false)}
            />
          )}
          <button
            type="button"
            onClick={() => setUserMenuOpen(prev => !prev)}
            className="cursor-pointer"
            aria-label={`User menu for ${userProfile.name}`}
            aria-expanded={userMenuOpen}
            title={userProfile.name}
          >
            <div
              className="w-[28px] h-[28px] rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center"
              style={{ background: 'var(--surface-translucent-active)', border: '1px solid var(--border-active)' }}
            >
              {userProfile.avatarUrl ? (
                <img src={userProfile.avatarUrl} className="w-full h-full object-cover" alt={userProfile.name} />
              ) : (
                <span className="font-headline text-[11px] font-bold" style={{ color: 'var(--primary)' }}>
                  {userProfile.name?.charAt(0)?.toUpperCase() || '?'}
                </span>
              )}
            </div>
          </button>
        </div>
      </div>
    </nav>
  )
}
