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
  userProfile,
}: SidebarProps) {
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  log.debug('render', { isExpanded, activeSpaceId, userMenuOpen })

  const handleUserMenuToggle = () => {
    log.info('user menu toggle', { wasOpen: userMenuOpen, isExpanded })
    if (!userMenuOpen && !isExpanded) onToggleExpand()
    setUserMenuOpen(prev => !prev)
  }

  const handleUserMenuClose = () => {
    log.debug('user menu close')
    setUserMenuOpen(false)
  }

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
      {/* Header — brand + space dots */}
      <div className={`flex items-center ${isExpanded ? 'justify-between px-4' : 'justify-center'} pt-4 pb-2`}>
        <button
          type="button"
          onClick={onToggleExpand}
          className="flex items-center gap-2 bg-transparent border-0 p-0 appearance-none cursor-pointer"
          aria-label={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
          title={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          <HexIcon size={isExpanded ? 20 : 18} color="var(--primary-hot)" />
          {isExpanded && (
            <span
              className="font-headline text-[12px] font-bold uppercase"
              style={{ color: 'var(--primary-hot)', letterSpacing: '0.2em' }}
            >
              nsty
            </span>
          )}
        </button>
        {isExpanded && (
          <SpaceDots
            spaces={spaces}
            activeSpaceId={activeSpaceId}
            onSwitchSpace={onSwitchSpace}
          />
        )}
      </div>

      {!isExpanded && (
        <div className="flex justify-center pb-2">
          <SpaceDots
            spaces={spaces}
            activeSpaceId={activeSpaceId}
            onSwitchSpace={onSwitchSpace}
          />
        </div>
      )}

      {/* Active space heading — expanded only */}
      {isExpanded && activeSpace && (
        <div className="px-4 pt-1 pb-3">
          <div
            className="font-headline text-[13px] font-medium truncate"
            style={{ color: 'var(--on-surface)', letterSpacing: '-0.01em' }}
            title={activeSpace.name}
          >
            {activeSpace.name}
          </div>
          <div
            className="font-body text-[10px] mt-0.5"
            style={{ color: 'var(--outline)' }}
          >
            {tabs.length} tab{tabs.length === 1 ? '' : 's'} · {pinnedPages.length} pinned
          </div>
        </div>
      )}

      <div
        className="mx-3"
        style={{ height: 1, background: 'var(--border-subtle)', marginBottom: 4 }}
      />

      <PinnedPages
        pages={pinnedPages}
        onReorder={onReorderPins}
        onUnpin={onUnpin}
        onOpenInNewTab={onOpenPinInNewTab}
        onClickPin={onClickPin}
        isExpanded={isExpanded}
      />

      <div className="flex-1 min-h-0 overflow-hidden">
        <TabList
          tabs={tabs}
          activeTabId={activeTabId}
          onSwitchTab={onSwitchTab}
          onCloseTab={onCloseTab}
          onPinTab={onPinTab}
        />
      </div>

      {/* New Tab — contained button so it doesn't float */}
      <div className={`${isExpanded ? 'px-3 pt-2 pb-2' : 'flex justify-center pt-2 pb-2'}`}>
        <button
          type="button"
          onClick={onNewTab}
          className={`flex items-center ${isExpanded ? 'gap-2 px-3 w-full' : 'justify-center w-8 h-8'} py-1.5 rounded-lg cursor-pointer transition-colors`}
          style={{
            color: 'var(--on-surface-variant)',
            background: 'var(--surface-translucent)',
            border: '1px solid var(--border-subtle)',
          }}
          aria-label="New tab"
          title="New tab"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          {isExpanded && <span className="font-body text-xs">New tab</span>}
        </button>
      </div>

      <div
        className="mx-3"
        style={{ height: 1, background: 'var(--border-subtle)' }}
      />

      {/* User footer */}
      <div className={`flex items-center ${isExpanded ? 'justify-between px-3' : 'justify-center'} pt-3 pb-4`}>
        {isExpanded && (
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center"
              style={{ background: 'var(--surface-translucent-active)', border: '1px solid var(--border-active)' }}
            >
              {userProfile.avatarUrl ? (
                <img src={userProfile.avatarUrl} className="w-full h-full object-cover" alt={userProfile.name} />
              ) : (
                <span className="font-headline text-[11px] font-bold" style={{ color: 'var(--primary-hot)' }}>
                  {userProfile.name?.charAt(0)?.toUpperCase() || '?'}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <div
                className="font-body text-[12px] truncate"
                style={{ color: 'var(--on-surface)' }}
                title={userProfile.name}
              >
                {userProfile.name || 'Local'}
              </div>
            </div>
          </div>
        )}
        <div className="relative">
          {userMenuOpen && (
            <UserMenu
              onOpenSettings={onOpenSettings}
              onClose={handleUserMenuClose}
            />
          )}
          <button
            type="button"
            onClick={handleUserMenuToggle}
            className={`cursor-pointer rounded-md flex items-center justify-center hover-surface ${isExpanded ? 'w-7 h-7' : ''}`}
            style={{ color: 'var(--on-surface-variant)' }}
            aria-label={`User menu for ${userProfile.name}`}
            aria-expanded={userMenuOpen}
            title={userProfile.name}
          >
            {isExpanded ? (
              <span className="material-symbols-outlined text-[16px]">more_horiz</span>
            ) : (
              <div
                className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center"
                style={{ background: 'var(--surface-translucent-active)', border: '1px solid var(--border-active)' }}
              >
                {userProfile.avatarUrl ? (
                  <img src={userProfile.avatarUrl} className="w-full h-full object-cover" alt={userProfile.name} />
                ) : (
                  <span className="font-headline text-[11px] font-bold" style={{ color: 'var(--primary-hot)' }}>
                    {userProfile.name?.charAt(0)?.toUpperCase() || '?'}
                  </span>
                )}
              </div>
            )}
          </button>
        </div>
      </div>
    </nav>
  )
}
