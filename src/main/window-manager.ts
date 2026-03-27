import { BrowserWindow } from 'electron'
import { TabManager } from './tab-manager'

const TOP_BAR_HEIGHT = 42
const SIDEBAR_EXPANDED = 240
const SIDEBAR_MINIMIZED = 48
const AI_PANEL_WIDTH = 300

export class WindowManager {
  private window: BrowserWindow
  private tabManager: TabManager
  private sidebarExpanded = true
  private aiPanelOpen = false

  constructor(window: BrowserWindow, tabManager: TabManager) {
    this.window = window
    this.tabManager = tabManager

    // Update layout on window resize
    this.window.on('resize', () => this.updateLayout())
  }

  get sidebarWidth(): number {
    return this.sidebarExpanded ? SIDEBAR_EXPANDED : SIDEBAR_MINIMIZED
  }

  get aiWidth(): number {
    return this.aiPanelOpen ? AI_PANEL_WIDTH : 0
  }

  toggleSidebar(): boolean {
    this.sidebarExpanded = !this.sidebarExpanded
    this.updateLayout()
    return this.sidebarExpanded
  }

  toggleAiPanel(): boolean {
    this.aiPanelOpen = !this.aiPanelOpen
    this.updateLayout()
    return this.aiPanelOpen
  }

  isSidebarExpanded(): boolean {
    return this.sidebarExpanded
  }

  isAiPanelOpen(): boolean {
    return this.aiPanelOpen
  }

  updateLayout(): void {
    const [windowWidth, windowHeight] = this.window.getContentSize()
    const contentX = this.sidebarWidth
    const contentWidth = windowWidth - this.sidebarWidth - this.aiWidth
    const contentY = TOP_BAR_HEIGHT
    const contentHeight = windowHeight - TOP_BAR_HEIGHT

    this.tabManager.setContentBounds(
      contentX,
      contentY,
      Math.max(contentWidth, 100),
      Math.max(contentHeight, 100),
    )
  }

  getLayoutInfo() {
    const [windowWidth, windowHeight] = this.window.getContentSize()
    return {
      sidebarWidth: this.sidebarWidth,
      sidebarExpanded: this.sidebarExpanded,
      aiPanelWidth: this.aiWidth,
      aiPanelOpen: this.aiPanelOpen,
      topBarHeight: TOP_BAR_HEIGHT,
      contentX: this.sidebarWidth,
      contentY: TOP_BAR_HEIGHT,
      contentWidth: windowWidth - this.sidebarWidth - this.aiWidth,
      contentHeight: windowHeight - TOP_BAR_HEIGHT,
      windowWidth,
      windowHeight,
    }
  }
}
