import type { BrowserWindow } from 'electron'
import type { TabManager } from './tab-manager'

const SIDEBAR_WIDTH_MINI = 60
const SIDEBAR_WIDTH_WIDE = 240
// Height reserved for the TopBar (address bar + nav controls + shield).
// Must match the height used in the renderer's TopBar component, otherwise
// the BrowserView will slide under the chrome or leave a gap.
const TOP_BAR_HEIGHT = 44

export class WindowManager {
  private window: BrowserWindow
  private tabManager: TabManager
  private sidebarExpanded = false

  constructor(window: BrowserWindow, tabManager: TabManager) {
    this.window = window
    this.tabManager = tabManager

    // Update layout on window resize
    this.window.on('resize', () => this.updateLayout())
  }

  get sidebarWidth(): number {
    return this.sidebarExpanded ? SIDEBAR_WIDTH_WIDE : SIDEBAR_WIDTH_MINI
  }

  get topBarHeight(): number {
    return TOP_BAR_HEIGHT
  }

  toggleSidebar(): boolean {
    this.sidebarExpanded = !this.sidebarExpanded
    this.updateLayout()
    return this.sidebarExpanded
  }

  isSidebarExpanded(): boolean {
    return this.sidebarExpanded
  }

  private getSize(): [number, number] {
    const [w = 0, h = 0] = this.window.getContentSize()
    return [w, h]
  }

  updateLayout(): void {
    const [windowWidth, windowHeight] = this.getSize()
    const contentX = this.sidebarWidth
    const contentWidth = windowWidth - this.sidebarWidth
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
    const [windowWidth, windowHeight] = this.getSize()
    return {
      sidebarWidth: this.sidebarWidth,
      sidebarExpanded: this.sidebarExpanded,
      contentX: this.sidebarWidth,
      contentY: TOP_BAR_HEIGHT,
      contentWidth: windowWidth - this.sidebarWidth,
      contentHeight: windowHeight - TOP_BAR_HEIGHT,
      windowWidth,
      windowHeight,
    }
  }
}
