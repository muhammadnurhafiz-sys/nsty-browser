import { useState, useEffect, useCallback } from 'react'
import { Sidebar } from './components/sidebar/Sidebar'
import { Dashboard } from './components/dashboard/Dashboard'
import { HistoryPanel } from './components/history/HistoryPanel'
import { UpdateNotification } from './components/UpdateNotification'
import { SkipToContent } from './components/SkipToContent'
import { useSpaces } from './hooks/useSpaces'
import { useShield } from './hooks/useShield'
import { useAi } from './hooks/useAi'
import { useUserProfile } from './hooks/useUserProfile'
import { useReducedMotion } from './hooks/useReducedMotion'

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
  const { messages: aiMessages, streamingContent, isStreaming, model: aiModel, sendMessage: sendAiMessage, changeModel: changeAiModel } = useAi()
  const { profile: userProfile } = useUserProfile()
  const reducedMotion = useReducedMotion()
  const [historyOpen, setHistoryOpen] = useState(false)
  const [sidebarExpanded, setSidebarExpanded] = useState(false)

  const sidebarWidth = sidebarExpanded ? 240 : 60
  const isDashboard = !activeTabId

  const activeSpace = spaces.find(s => s.id === activeSpaceId)

  // Listen for sidebar toggle from main process
  useEffect(() => {
    if (!window.nsty) return
    return window.nsty.onSidebarToggle(() => {
      setSidebarExpanded(prev => !prev)
    })
  }, [])

  // Listen for history toggle from main process
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

  // Listen for new tab shortcut from main process
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
    <div className="h-screen w-screen flex overflow-hidden" style={{ background: 'var(--space-gradient-1)' }}>
      <SkipToContent />

      {/* Sidebar — Arc-style with command palette, inline tabs, spaces */}
      <Sidebar
        spaces={spaces}
        activeSpaceId={activeSpaceId}
        activeTabId={activeTabId}
        isExpanded={sidebarExpanded}
        onToggleExpand={() => setSidebarExpanded(prev => !prev)}
        onSwitchSpace={switchSpace}
        onSwitchTab={switchTab}
        onCloseTab={closeTab}
        onNewTab={handleNewTab}
        onPinTab={pinTab}
        onUnpin={unpinPage}
        onReorderPins={reorderPins}
        onClickPin={clickPin}
        onOpenPinInNewTab={openPinInNewTab}
        onOpenSettings={() => { /* Settings now in command bar */ }}
        onOpenHistory={() => { setHistoryOpen(true); window.nsty?.showOverlay() }}
        onNavigate={handleNavigate}
        onBack={() => window.nsty?.goBack()}
        onForward={() => window.nsty?.goForward()}
        onReload={() => window.nsty?.reload()}
        shieldCount={totalBlocked}
        shieldStats={shieldStats}
        shieldPopupOpen={shieldPopupOpen}
        onToggleShieldPopup={toggleShieldPopup}
        onCloseShieldPopup={closeShieldPopup}
        onDisableShieldForSite={disableForSite}
        ai={{
          messages: aiMessages,
          streamingContent,
          isStreaming,
          model: aiModel,
          sendMessage: sendAiMessage,
          changeModel: changeAiModel,
        }}
        userProfile={userProfile}
      />

      {/* Main content area — full height, offset by sidebar only */}
      <div
        className="flex-1 flex flex-col min-w-0"
        style={{
          marginLeft: sidebarWidth,
          transition: reducedMotion ? 'none' : 'margin-left var(--transition-normal)',
        }}
      >
        {/* Content area - BrowserViews are rendered here by Electron */}
        <main id="main-content" className="flex-1">
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

      {/* History Panel */}
      <HistoryPanel
        isOpen={historyOpen}
        onClose={() => { setHistoryOpen(false); window.nsty?.hideOverlay() }}
        onNavigate={handleNavigate}
      />

      {/* Update Notification */}
      <UpdateNotification />
    </div>
  )
}
