import { useState, useCallback, useEffect } from 'react'
import type { Space, Tab, PinnedPage, TabUpdateEvent } from '@shared/types'

const DEFAULT_SPACES: Space[] = [
  { id: 'work', name: 'Work', color: '#7c3aed', pinnedPages: [], tabs: [] },
  { id: 'personal', name: 'Personal', color: '#60a5fa', pinnedPages: [], tabs: [] },
  { id: 'dev', name: 'Dev', color: '#4ade80', pinnedPages: [], tabs: [] },
]

export function useSpaces() {
  const [spaces, setSpaces] = useState<Space[]>(DEFAULT_SPACES)
  const [activeSpaceId, setActiveSpaceId] = useState('work')
  const [activeTabId, setActiveTabId] = useState<string | null>(null)

  const activeSpace = spaces.find(s => s.id === activeSpaceId)
  const activeTabs = activeSpace?.tabs ?? []
  const pinnedPages = activeSpace?.pinnedPages ?? []
  const activeTab = activeTabs.find(t => t.id === activeTabId) ?? null

  // Listen for tab updates from main process
  useEffect(() => {
    if (!window.nsty) return

    const cleanupTabUpdated = window.nsty.onTabUpdated((data) => {
      const event = data as TabUpdateEvent
      setSpaces(prev => prev.map(space => ({
        ...space,
        tabs: space.tabs.map(tab =>
          tab.id === event.tabId
            ? { ...tab, url: event.url ?? tab.url, title: event.title ?? tab.title, faviconUrl: event.faviconUrl ?? tab.faviconUrl }
            : tab
        ),
      })))
    })

    return cleanupTabUpdated
  }, [])

  const switchSpace = useCallback((spaceId: string) => {
    setActiveSpaceId(spaceId)
    window.nsty?.switchSpace(spaceId)
    const space = spaces.find(s => s.id === spaceId)
    const lastTab = space?.tabs[space.tabs.length - 1]
    setActiveTabId(lastTab?.id ?? null)
  }, [spaces])

  const switchTab = useCallback((tabId: string) => {
    setActiveTabId(tabId)
    window.nsty?.switchTab(tabId)
  }, [])

  const createTab = useCallback((url: string) => {
    window.nsty?.createTab(url, activeSpaceId)
    const tempTab: Tab = {
      id: `temp-${Date.now()}`,
      url,
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
  }, [activeSpaceId])

  const closeTab = useCallback((tabId: string) => {
    window.nsty?.closeTab(tabId)
    setSpaces(prev => prev.map(space => ({
      ...space,
      tabs: space.tabs.filter(t => t.id !== tabId),
    })))
    if (activeTabId === tabId) {
      const remaining = activeTabs.filter(t => t.id !== tabId)
      const nextTab = remaining[remaining.length - 1]
      setActiveTabId(nextTab?.id ?? null)
    }
  }, [activeTabId, activeTabs])

  const pinTab = useCallback((tab: Tab) => {
    const newPin: PinnedPage = {
      url: tab.url,
      title: tab.title,
      faviconUrl: tab.faviconUrl,
      order: pinnedPages.length,
    }
    setSpaces(prev => prev.map(space =>
      space.id === activeSpaceId
        ? {
            ...space,
            pinnedPages: [...space.pinnedPages, newPin],
            tabs: space.tabs.filter(t => t.id !== tab.id),
          }
        : space
    ))
    // Close the tab since it's now pinned
    window.nsty?.closeTab(tab.id)
    if (activeTabId === tab.id) {
      const remaining = activeTabs.filter(t => t.id !== tab.id)
      setActiveTabId(remaining[remaining.length - 1]?.id ?? null)
    }
  }, [activeSpaceId, pinnedPages, activeTabId, activeTabs])

  const unpinPage = useCallback((url: string) => {
    setSpaces(prev => prev.map(space =>
      space.id === activeSpaceId
        ? { ...space, pinnedPages: space.pinnedPages.filter(p => p.url !== url) }
        : space
    ))
  }, [activeSpaceId])

  const reorderPins = useCallback((reordered: PinnedPage[]) => {
    setSpaces(prev => prev.map(space =>
      space.id === activeSpaceId
        ? { ...space, pinnedPages: reordered }
        : space
    ))
  }, [activeSpaceId])

  const clickPin = useCallback((url: string) => {
    // Navigate active tab to pinned URL, or create new tab
    if (activeTabId) {
      window.nsty?.navigateTo(url)
    } else {
      createTab(url)
    }
  }, [activeTabId, createTab])

  const openPinInNewTab = useCallback((url: string) => {
    createTab(url)
  }, [createTab])

  return {
    spaces,
    activeSpaceId,
    activeTabId,
    activeTab,
    activeTabs,
    pinnedPages,
    switchSpace,
    switchTab,
    createTab,
    closeTab,
    pinTab,
    unpinPage,
    reorderPins,
    clickPin,
    openPinInNewTab,
  }
}
