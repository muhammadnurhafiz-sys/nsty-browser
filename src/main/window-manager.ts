import { BrowserWindow } from 'electron'
import { TabManager } from './tab-manager'

const TOP_BAR_HEIGHT = 52
const SIDEBAR_WIDTH = 80
const AI_PANEL_WIDTH = 340

export class WindowManager {
  private window: BrowserWindow
  private tabManager: TabManager
  private aiPanelOpen = false

  constructor(window: BrowserWindow, tabManager: TabManager) {
    this.window = window
    this.tabManager = tabManager

    // Update layout on window resize
    this.window.on('resize', () => this.updateLayout())
  }

  get sidebarWidth(): number {
    return SIDEBAR_WIDTH
  }

  get aiWidth(): number {
    return this.aiPanelOpen ? AI_PANEL_WIDTH : 0
  }

  toggleSidebar(): boolean {
    // Sidebar is now fixed-width, no toggle needed
    return true
  }

  toggleAiPanel(): boolean {
    this.aiPanelOpen = !this.aiPanelOpen
    this.updateLayout()
    return this.aiPanelOpen
  }

  isSidebarExpanded(): boolean {
    return true
  }

  isAiPanelOpen(): boolean {
    return this.aiPanelOpen
  }

  updateLayout(): void {
    const [windowWidth, windowHeight] = this.window.getContentSize()
    const contentX = SIDEBAR_WIDTH
    const contentWidth = windowWidth - SIDEBAR_WIDTH - this.aiWidth
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
      sidebarWidth: SIDEBAR_WIDTH,
      sidebarExpanded: true,
      aiPanelWidth: this.aiWidth,
      aiPanelOpen: this.aiPanelOpen,
      topBarHeight: TOP_BAR_HEIGHT,
      contentX: SIDEBAR_WIDTH,
      contentY: TOP_BAR_HEIGHT,
      contentWidth: windowWidth - SIDEBAR_WIDTH - this.aiWidth,
      contentHeight: windowHeight - TOP_BAR_HEIGHT,
      windowWidth,
      windowHeight,
    }
  }
}
