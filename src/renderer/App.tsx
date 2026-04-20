import { useState, useEffect, useCallback } from 'react'
import { Sidebar } from './components/sidebar/Sidebar'
import { TopBar } from './components/topbar/TopBar'
import { Dashboard } from './components/dashboard/Dashboard'
import { HistoryPanel } from './components/history/HistoryPanel'
import { UpdateNotification } from './components/UpdateNotification'
import { SkipToContent } from './components/SkipToContent'
import { useSpaces } from './hooks/useSpaces'
import { useShield } from './hooks/useShield'
import { useUserProfile } from './hooks/useUserProfile'
import { useReducedMotion } from './hooks/useReducedMotion'
import { createLogger } from './utils/logger'

const log = createLogger('App')

export function App() {
  const {
    spaces,
    activeSpaceId,
    activeTabId,
    switchSpace,
    switchTab,
    createTab,
    closeTab,
    pinTab,
    unpinPage,
    reorderPins,
    clickPin,
    openPinInNewTab,
  } = useSpaces()

  const { stats: shieldStats, totalBlocked, popupOpen: shieldPopupOpen, togglePopup: toggleShieldPopup, closePopup: closeShieldPopup, disableForSite } = useShield()
  const { profile: userProfile } = useUserProfile()
  const reducedMotion = useReducedMotion()
  const [historyOpen, setHistoryOpen] = useState(false)
  const [sidebarExpanded, setSidebarExpanded] = useState(false)

  const activeSpace = spaces.find(s => s.id === activeSpaceId)
  const activeTab = activeSpace?.tabs.find(t => t.id === activeTabId)
  const currentUrl = activeTab?.url ?? ''
  const isDashboard = !activeTabId

  log.debug('render', { sidebarExpanded, isDashboard, currentUrl })

  // Main process is the source of truth for sidebar width (owns BrowserView bounds).
  useEffect(() => {
    if (!window.nsty) return
    return window.nsty.onSidebarToggle((expanded) => {
      setSidebarExpanded(expanded)
    })
  }, [])

  const handleToggleSidebar = useCallback(() => {
    // Optimistic flip so the click feels instant even if the IPC round-trip
    // stalls. The `onSidebarToggle` subscription reconciles to main's truth.
    setSidebarExpanded(prev => !prev)
    window.nsty?.toggleSidebar()
    log.info('toggle sidebar')
  }, [])

  useEffect(() => {
    if (!window.nsty?.onHistoryToggle) return
    return window.nsty.onHistoryToggle(() => {
      setHistoryOpen(prev => {
        const next = !prev
        if (next) window.nsty?.showOverlay()
        else window.nsty?.hideOverlay()
        return next
      })
    })
  }, [])

  const handleNewTab = useCallback(() => {
    createTab('https://www.google.com')
  }, [createTab])

  useEffect(() => {
    if (!window.nsty?.onNewTabShortcut) return
    return window.nsty.onNewTabShortcut(() => {
      handleNewTab()
    })
  }, [handleNewTab])

  const handleNavigate = useCallback((url: string) => {
    window.nsty?.navigateTo(url)
  }, [])

  return (
    <div
      className="h-screen w-screen flex flex-col overflow-hidden"
      style={{ background: 'var(--space-gradient-1)' }}
    >
      <SkipToContent />

      <TopBar
        currentUrl={currentUrl}
        onBack={() => window.nsty?.goBack()}
        onForward={() => window.nsty?.goForward()}
        onReload={() => window.nsty?.reload()}
        onNavigate={handleNavigate}
        onOpenHistory={() => { setHistoryOpen(true); window.nsty?.showOverlay() }}
        shieldCount={totalBlocked}
        shieldStats={shieldStats}
        shieldPopupOpen={shieldPopupOpen}
        onToggleShieldPopup={toggleShieldPopup}
        onCloseShieldPopup={closeShieldPopup}
        onDisableShieldForSite={disableForSite}
      />

      <div className="flex-1 flex min-h-0">
        <Sidebar
          spaces={spaces}
          activeSpaceId={activeSpaceId}
          activeTabId={activeTabId}
          isExpanded={sidebarExpanded}
          onToggleExpand={handleToggleSidebar}
          onSwitchSpace={switchSpace}
          onSwitchTab={switchTab}
          onCloseTab={closeTab}
          onNewTab={handleNewTab}
          onPinTab={pinTab}
          onUnpin={unpinPage}
          onReorderPins={reorderPins}
          onClickPin={clickPin}
          onOpenPinInNewTab={openPinInNewTab}
          onOpenSettings={() => {}}
          userProfile={userProfile}
        />

        <div
          className="flex-1 flex flex-col min-w-0"
          style={{
            transition: reducedMotion ? 'none' : 'width var(--transition-normal)',
          }}
        >
          <main id="main-content" className="flex-1 min-h-0">
            {isDashboard && (
              <Dashboard
                shieldStats={shieldStats}
                totalBlocked={totalBlocked}
                recentTabs={activeSpace?.tabs ?? []}
                pinnedPages={activeSpace?.pinnedPages ?? []}
                onNavigate={handleNavigate}
                userName={userProfile.name}
              />
            )}
          </main>
        </div>
      </div>

      <HistoryPanel
        isOpen={historyOpen}
        onClose={() => { setHistoryOpen(false); window.nsty?.hideOverlay() }}
        onNavigate={handleNavigate}
      />

      <UpdateNotification />
    </div>
  )
}
