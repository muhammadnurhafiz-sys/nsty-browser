import { useState, useEffect, useCallback } from 'react'
import { Sidebar } from './components/sidebar/Sidebar'
import { TopBar } from './components/topbar/TopBar'
import type { Space, Tab, TabUpdateEvent } from '@shared/types'

const DEFAULT_SPACES: Space[] = [
  {
    id: 'work',
    name: 'Work',
    color: '#7c3aed',
    pinnedPages: [],
    tabs: [],
  },
  {
    id: 'personal',
    name: 'Personal',
    color: '#60a5fa',
    pinnedPages: [],
    tabs: [],
  },
  {
    id: 'dev',
    name: 'Dev',
    color: '#4ade80',
    pinnedPages: [],
    tabs: [],
  },
]

export function App() {
  const [spaces, setSpaces] = useState<Space[]>(DEFAULT_SPACES)
  const [activeSpaceId, setActiveSpaceId] = useState('work')
  const [activeTabId, setActiveTabId] = useState<string | null>(null)
  const [currentUrl, setCurrentUrl] = useState('')
  const [sidebarExpanded, setSidebarExpanded] = useState(true)
  const [shieldCount] = useState(0)

  // Update tab in spaces state
  const updateTabInSpaces = useCallback((tabId: string, updates: Partial<Tab>) => {
    setSpaces(prev => prev.map(space => ({
      ...space,
      tabs: space.tabs.map(tab =>
        tab.id === tabId ? { ...tab, ...updates } : tab
      ),
    })))
  }, [])

  // Listen for IPC events
  useEffect(() => {
    if (!window.nsty) return

    const cleanupTabUpdated = window.nsty.onTabUpdated((data) => {
      const event = data as TabUpdateEvent
      updateTabInSpaces(event.tabId, {
        url: event.url,
        title: event.title,
        faviconUrl: event.faviconUrl,
      })
      if (event.tabId === activeTabId && event.url) {
        setCurrentUrl(event.url)
      }
    })

    const cleanupSidebar = window.nsty.onSidebarToggle((expanded) => {
      setSidebarExpanded(expanded)
    })

    return () => {
      cleanupTabUpdated()
      cleanupSidebar()
    }
  }, [activeTabId, updateTabInSpaces])

  const handleNewTab = useCallback(() => {
    if (!window.nsty) return
    window.nsty.createTab('https://www.google.com', activeSpaceId)

    // Optimistically add tab to state (will be updated by IPC)
    const tempTab: Tab = {
      id: `temp-${Date.now()}`,
      url: 'https://www.google.com',
      title: 'New Tab',
      faviconUrl: '',
      spaceId: activeSpaceId,
      isActive: true,
      createdAt: Date.now(),
      scrollPosition: 0,
    }

    setSpaces(prev => prev.map(space =>
      space.id === activeSpaceId
        ? { ...space, tabs: [...space.tabs, tempTab] }
        : space
    ))
    setActiveTabId(tempTab.id)
    setCurrentUrl('https://www.google.com')
  }, [activeSpaceId])

  const handleSwitchSpace = useCallback((spaceId: string) => {
    setActiveSpaceId(spaceId)
    window.nsty?.switchSpace(spaceId)
    const space = spaces.find(s => s.id === spaceId)
    const lastTab = space?.tabs[space.tabs.length - 1]
    setActiveTabId(lastTab?.id ?? null)
    setCurrentUrl(lastTab?.url ?? '')
  }, [spaces])

  const handleSwitchTab = useCallback((tabId: string) => {
    setActiveTabId(tabId)
    window.nsty?.switchTab(tabId)
    const tab = spaces.flatMap(s => s.tabs).find(t => t.id === tabId)
    if (tab) setCurrentUrl(tab.url)
  }, [spaces])

  const handleCloseTab = useCallback((tabId: string) => {
    window.nsty?.closeTab(tabId)
    setSpaces(prev => prev.map(space => ({
      ...space,
      tabs: space.tabs.filter(t => t.id !== tabId),
    })))
    if (activeTabId === tabId) {
      const space = spaces.find(s => s.id === activeSpaceId)
      const remaining = space?.tabs.filter(t => t.id !== tabId) ?? []
      const nextTab = remaining[remaining.length - 1]
      setActiveTabId(nextTab?.id ?? null)
      setCurrentUrl(nextTab?.url ?? '')
    }
  }, [activeTabId, activeSpaceId, spaces])

  const handleNavigate = useCallback((url: string) => {
    window.nsty?.navigateTo(url)
    setCurrentUrl(url)
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
        onSwitchSpace={handleSwitchSpace}
        onSwitchTab={handleSwitchTab}
        onCloseTab={handleCloseTab}
        onNewTab={handleNewTab}
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
          shieldCount={shieldCount}
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
    </div>
  )
}

