import { BrowserView, BrowserWindow } from 'electron'
import { randomUUID } from 'crypto'
import type { Tab, TabUpdateEvent } from '../shared/types'

interface ManagedTab {
  tab: Tab
  view: BrowserView
}

export class TabManager {
  private tabs = new Map<string, ManagedTab>()
  private activeTabId: string | null = null
  private window: BrowserWindow

  constructor(window: BrowserWindow) {
    this.window = window
  }

  createTab(url: string, spaceId: string): Tab {
    const id = randomUUID()
    const view = new BrowserView({
      webPreferences: {
        contextIsolation: true,
        sandbox: true,
      },
    })

    const tab: Tab = {
      id,
      url,
      title: 'New Tab',
      faviconUrl: '',
      spaceId,
      isActive: false,
      createdAt: Date.now(),
      scrollPosition: 0,
    }

    // Listen for navigation events
    view.webContents.on('did-navigate', (_event, navUrl) => {
      tab.url = navUrl
      tab.title = view.webContents.getTitle()
      this.emitTabUpdate(tab)
    })

    view.webContents.on('did-navigate-in-page', (_event, navUrl) => {
      tab.url = navUrl
      this.emitTabUpdate(tab)
    })

    view.webContents.on('page-title-updated', (_event, title) => {
      tab.title = title
      this.emitTabUpdate(tab)
    })

    view.webContents.on('page-favicon-updated', (_event, favicons) => {
      if (favicons.length > 0) {
        tab.faviconUrl = favicons[0]
        this.emitTabUpdate(tab)
      }
    })

    this.tabs.set(id, { tab, view })

    // Load the URL
    if (url) {
      const loadUrl = url.startsWith('http') ? url : `https://${url}`
      view.webContents.loadURL(loadUrl).catch(() => {
        // If URL fails, try as search
        view.webContents.loadURL(`https://www.google.com/search?q=${encodeURIComponent(url)}`)
      })
    }

    // Activate the new tab
    this.switchTab(id)

    return tab
  }

  closeTab(tabId: string): void {
    const managed = this.tabs.get(tabId)
    if (!managed) return

    if (this.activeTabId === tabId) {
      this.window.removeBrowserView(managed.view)
      this.activeTabId = null

      // Switch to another tab in same space
      const sameSpaceTabs = this.getTabsBySpace(managed.tab.spaceId)
      const remaining = sameSpaceTabs.filter(t => t.id !== tabId)
      if (remaining.length > 0) {
        this.switchTab(remaining[remaining.length - 1].id)
      }
    } else {
      this.window.removeBrowserView(managed.view)
    }

    managed.view.webContents.close()
    this.tabs.delete(tabId)
  }

  switchTab(tabId: string): void {
    const managed = this.tabs.get(tabId)
    if (!managed) return

    // Hide current active tab
    if (this.activeTabId && this.activeTabId !== tabId) {
      const current = this.tabs.get(this.activeTabId)
      if (current) {
        current.tab.isActive = false
        this.window.removeBrowserView(current.view)
      }
    }

    // Show new tab
    managed.tab.isActive = true
    this.activeTabId = tabId
    this.window.addBrowserView(managed.view)
    this.updateViewBounds(managed.view)
  }

  navigateTo(url: string): void {
    if (!this.activeTabId) return
    const managed = this.tabs.get(this.activeTabId)
    if (!managed) return

    const loadUrl = url.startsWith('http') ? url : `https://${url}`
    managed.view.webContents.loadURL(loadUrl).catch(() => {
      managed.view.webContents.loadURL(`https://www.google.com/search?q=${encodeURIComponent(url)}`)
    })
  }

  goBack(): void {
    const view = this.getActiveView()
    if (view?.webContents.canGoBack()) {
      view.webContents.goBack()
    }
  }

  goForward(): void {
    const view = this.getActiveView()
    if (view?.webContents.canGoForward()) {
      view.webContents.goForward()
    }
  }

  reload(): void {
    const view = this.getActiveView()
    view?.webContents.reload()
  }

  getTabsBySpace(spaceId: string): Tab[] {
    const tabs: Tab[] = []
    for (const managed of this.tabs.values()) {
      if (managed.tab.spaceId === spaceId) {
        tabs.push(managed.tab)
      }
    }
    return tabs.sort((a, b) => a.createdAt - b.createdAt)
  }

  getAllTabs(): Tab[] {
    return Array.from(this.tabs.values()).map(m => m.tab)
  }

  getActiveTab(): Tab | null {
    if (!this.activeTabId) return null
    return this.tabs.get(this.activeTabId)?.tab ?? null
  }

  getActiveView(): BrowserView | null {
    if (!this.activeTabId) return null
    return this.tabs.get(this.activeTabId)?.view ?? null
  }

  switchSpace(spaceId: string): void {
    // Hide current tab
    if (this.activeTabId) {
      const current = this.tabs.get(this.activeTabId)
      if (current) {
        current.tab.isActive = false
        this.window.removeBrowserView(current.view)
      }
      this.activeTabId = null
    }

    // Find first tab in new space and activate it
    const spaceTabs = this.getTabsBySpace(spaceId)
    if (spaceTabs.length > 0) {
      this.switchTab(spaceTabs[spaceTabs.length - 1].id)
    }
  }

  updateViewBounds(view?: BrowserView): void {
    const target = view ?? (this.activeTabId ? this.tabs.get(this.activeTabId)?.view : null)
    if (!target) return

    const bounds = this.window.getContentBounds()
    // These will be updated by WindowManager with proper sidebar/AI panel offsets
    target.setBounds({
      x: 0,
      y: 0,
      width: bounds.width,
      height: bounds.height,
    })
  }

  setContentBounds(x: number, y: number, width: number, height: number): void {
    if (!this.activeTabId) return
    const managed = this.tabs.get(this.activeTabId)
    if (!managed) return
    managed.view.setBounds({ x, y, width, height })
  }

  private emitTabUpdate(tab: Tab): void {
    const event: TabUpdateEvent = {
      tabId: tab.id,
      url: tab.url,
      title: tab.title,
      faviconUrl: tab.faviconUrl,
    }
    this.window.webContents.send('tab:updated', event)
  }
}
