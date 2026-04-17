import type { BrowserWindow } from 'electron'
import type { TabManager } from './tab-manager'

const SIDEBAR_WIDTH_MINI = 60
const SIDEBAR_WIDTH_WIDE = 240

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
    const contentY = 0
    const contentHeight = windowHeight

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
      contentY: 0,
      contentWidth: windowWidth - this.sidebarWidth,
      contentHeight: windowHeight,
      windowWidth,
      windowHeight,
    }
  }
}
