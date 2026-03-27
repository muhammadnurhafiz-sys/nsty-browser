import { useState, useEffect, useCallback } from 'react'
import { Sidebar } from './components/sidebar/Sidebar'
import { TopBar } from './components/topbar/TopBar'
import { AiPanel } from './components/ai/AiPanel'
import { HistoryPanel } from './components/history/HistoryPanel'
import { SettingsPanel } from './components/settings/SettingsPanel'
import { useSpaces } from './hooks/useSpaces'
import { useShield } from './hooks/useShield'
import { useAi } from './hooks/useAi'

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
  const [sidebarExpanded, setSidebarExpanded] = useState(true)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const currentUrl = activeTab?.url ?? ''

  // Listen for sidebar toggle from main process
  useEffect(() => {
    if (!window.nsty) return
    return window.nsty.onSidebarToggle((expanded) => {
      setSidebarExpanded(expanded)
    })
  }, [])

  // Listen for new tab shortcut
  useEffect(() => {
    if (!window.nsty) return
    // @ts-expect-error custom IPC event
    const handler = () => handleNewTab()
    window.addEventListener('shortcut:newTab', handler)
    return () => window.removeEventListener('shortcut:newTab', handler)
  }, [])

  const handleNewTab = useCallback(() => {
    createTab('https://www.google.com')
  }, [createTab])

  const handleNavigate = useCallback((url: string) => {
    window.nsty?.navigateTo(url)
  }, [])

  const handleToggleAi = useCallback(() => {
    window.nsty?.toggleAiPanel()
  }, [])

  // Create initial tab if none exist
  useEffect(() => {
    const activeSpace = spaces.find(s => s.id === activeSpaceId)
    if (activeSpace && activeSpace.tabs.length === 0) {
      handleNewTab()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="h-screen w-screen flex overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      {/* Sidebar */}
      <Sidebar
        spaces={spaces}
        activeSpaceId={activeSpaceId}
        activeTabId={activeTabId}
        expanded={sidebarExpanded}
        onSwitchSpace={switchSpace}
        onSwitchTab={switchTab}
        onCloseTab={closeTab}
        onNewTab={handleNewTab}
        onPinTab={pinTab}
        onUnpin={unpinPage}
        onReorderPins={reorderPins}
        onClickPin={clickPin}
        onOpenPinInNewTab={openPinInNewTab}
      />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
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
        />

        {/* Content area - BrowserViews are rendered here by Electron */}
        <div className="flex-1" style={{ background: '#0f172a' }}>
          {!activeTabId && (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="text-4xl mb-4">🌐</div>
                <h1 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                  Nsty Browser
                </h1>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
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

      {/* History Panel */}
      <HistoryPanel
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onNavigate={handleNavigate}
      />

      {/* Settings Panel */}
      <SettingsPanel
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  )
}
