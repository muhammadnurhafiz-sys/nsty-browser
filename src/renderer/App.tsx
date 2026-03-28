import { useState, useEffect, useCallback } from 'react'
import { Sidebar } from './components/sidebar/Sidebar'
import { TopBar } from './components/topbar/TopBar'
import { AiPanel } from './components/ai/AiPanel'
import { HistoryPanel } from './components/history/HistoryPanel'
import { SettingsPanel } from './components/settings/SettingsPanel'
import { UpdateNotification } from './components/UpdateNotification'
import { TabDrawer } from './components/sidebar/TabDrawer'
import { useSpaces } from './hooks/useSpaces'
import { useShield } from './hooks/useShield'
import { useAi } from './hooks/useAi'
import { useUserProfile } from './hooks/useUserProfile'

export function App() {
  const {
    spaces,
    activeSpaceId,
    activeTabId,
    activeTab,
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
  const { messages: aiMessages, streamingContent, isStreaming, model: aiModel, isOpen: aiOpen, sendMessage: sendAiMessage, changeModel: changeAiModel, closePanel: closeAiPanel } = useAi()
  const { profile: userProfile } = useUserProfile()
  const [historyOpen, setHistoryOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [tabDrawerOpen, setTabDrawerOpen] = useState(false)

  const currentUrl = activeTab?.url ?? ''
  const activeSpace = spaces.find(s => s.id === activeSpaceId)

  // Listen for sidebar toggle from main process (no-op now, sidebar is fixed)
  useEffect(() => {
    if (!window.nsty) return
    return window.nsty.onSidebarToggle(() => {
      // Sidebar is now fixed-width, toggle opens/closes tab drawer instead
      setTabDrawerOpen(prev => !prev)
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

  const handleToggleAi = useCallback(() => {
    window.nsty?.toggleAiPanel()
  }, [])

  // Create initial tab if none exist
  useEffect(() => {
    const space = spaces.find(s => s.id === activeSpaceId)
    if (space && space.tabs.length === 0) {
      handleNewTab()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="h-screen w-screen flex overflow-hidden" style={{ background: 'var(--surface)' }}>
      {/* Sidebar — fixed 80px icon bar */}
      <Sidebar
        spaces={spaces}
        activeSpaceId={activeSpaceId}
        activeTabId={activeTabId}
        onSwitchSpace={switchSpace}
        onSwitchTab={switchTab}
        onCloseTab={closeTab}
        onNewTab={handleNewTab}
        onPinTab={pinTab}
        onUnpin={unpinPage}
        onReorderPins={reorderPins}
        onClickPin={clickPin}
        onOpenPinInNewTab={openPinInNewTab}
        onOpenSettings={() => { setSettingsOpen(true); window.nsty?.showOverlay() }}
        onOpenHistory={() => { setHistoryOpen(true); window.nsty?.showOverlay() }}
        onToggleTabDrawer={() => setTabDrawerOpen(prev => !prev)}
        userProfile={userProfile}
      />

      {/* Main content area — offset by sidebar */}
      <div className="flex-1 flex flex-col min-w-0" style={{ marginLeft: 80 }}>
        {/* Floating command bar */}
        <TopBar
          url={currentUrl}
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
          onToggleAi={handleToggleAi}
          spaces={spaces}
          activeSpaceId={activeSpaceId}
          onSwitchSpace={switchSpace}
        />

        {/* Content area - BrowserViews are rendered here by Electron */}
        <div className="flex-1" style={{ background: 'var(--surface)' }}>
          {!activeTabId && (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <span
                  className="material-symbols-outlined mb-4 block"
                  style={{ fontSize: 48, color: 'var(--primary)', opacity: 0.3 }}
                >
                  language
                </span>
                <h1 className="font-headline text-xl font-semibold mb-2" style={{ color: 'var(--on-surface)' }}>
                  Nsty Browser
                </h1>
                <p className="font-body text-sm" style={{ color: 'var(--outline)' }}>
                  Press Ctrl+T to open a new tab
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* AI Panel */}
      <AiPanel
        isOpen={aiOpen}
        messages={aiMessages}
        streamingContent={streamingContent}
        isStreaming={isStreaming}
        model={aiModel}
        onSend={sendAiMessage}
        onModelChange={changeAiModel}
        onClose={closeAiPanel}
      />

      {/* Tab Drawer */}
      <TabDrawer
        isOpen={tabDrawerOpen}
        tabs={activeSpace?.tabs ?? []}
        pinnedPages={activeSpace?.pinnedPages ?? []}
        activeTabId={activeTabId}
        onSwitchTab={switchTab}
        onCloseTab={closeTab}
        onPinTab={pinTab}
        onUnpin={unpinPage}
        onReorderPins={reorderPins}
        onClickPin={clickPin}
        onOpenPinInNewTab={openPinInNewTab}
        onClose={() => setTabDrawerOpen(false)}
      />

      {/* History Panel */}
      <HistoryPanel
        isOpen={historyOpen}
        onClose={() => { setHistoryOpen(false); window.nsty?.hideOverlay() }}
        onNavigate={handleNavigate}
      />

      {/* Settings Panel */}
      <SettingsPanel
        isOpen={settingsOpen}
        onClose={() => { setSettingsOpen(false); window.nsty?.hideOverlay() }}
      />

      {/* Update Notification */}
      <UpdateNotification />
    </div>
  )
}
