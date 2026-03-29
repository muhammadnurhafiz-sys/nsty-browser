import type { Tab, PinnedPage } from '@shared/types'
import { PinnedPages } from './PinnedPages'
import { TabList } from './TabList'

interface TabDrawerProps {
  isOpen: boolean
  sidebarWidth: number
  tabs: Tab[]
  pinnedPages: PinnedPage[]
  activeTabId: string | null
  onSwitchTab: (tabId: string) => void
  onCloseTab: (tabId: string) => void
  onPinTab: (tab: Tab) => void
  onUnpin: (url: string) => void
  onReorderPins: (pages: PinnedPage[]) => void
  onClickPin: (url: string) => void
  onOpenPinInNewTab: (url: string) => void
  onClose: () => void
}

export function TabDrawer({
  isOpen,
  sidebarWidth,
  tabs,
  pinnedPages,
  activeTabId,
  onSwitchTab,
  onCloseTab,
  onPinTab,
  onUnpin,
  onReorderPins,
  onClickPin,
  onOpenPinInNewTab,
  onClose,
}: TabDrawerProps) {
  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 fade-in"
        style={{ background: 'rgba(0, 0, 0, 0.4)', left: sidebarWidth }}
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        className="fixed top-0 bottom-0 z-50 flex flex-col slide-in-left hide-scrollbar overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-label="Tab drawer"
        style={{
          left: sidebarWidth,
          width: 280,
          background: 'var(--surface-container)',
          borderRight: '1px solid rgba(73, 72, 71, 0.15)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-6 pb-4">
          <h2 className="font-headline text-sm font-semibold tracking-wider uppercase" style={{ color: 'var(--primary)' }}>
            Tabs
          </h2>
          <button
            onClick={onClose}
            aria-label="Close tab drawer"
            className="w-7 h-7 rounded-full flex items-center justify-center cursor-pointer hover:bg-white/10 transition-colors"
            style={{ color: 'var(--outline)' }}
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">close</span>
          </button>
        </div>

        {/* Pinned Pages */}
        {pinnedPages.length > 0 && (
          <div className="px-3">
            <PinnedPages
              pages={pinnedPages}
              onReorder={onReorderPins}
              onUnpin={onUnpin}
              onOpenInNewTab={onOpenPinInNewTab}
              onClickPin={onClickPin}
            />
          </div>
        )}

        {/* Tab List */}
        <div className="flex-1 px-3">
          <TabList
            tabs={tabs}
            activeTabId={activeTabId}
            onSwitchTab={(tabId) => {
              onSwitchTab(tabId)
              onClose()
            }}
            onCloseTab={onCloseTab}
            onPinTab={onPinTab}
          />
        </div>
      </div>
    </>
  )
}
