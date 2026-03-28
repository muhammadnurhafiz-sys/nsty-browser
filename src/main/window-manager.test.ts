import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock electron
vi.mock('electron', () => ({
  BrowserWindow: vi.fn(),
}))

// Mock tab-manager
vi.mock('./tab-manager', () => ({
  TabManager: vi.fn(),
}))

describe('WindowManager', () => {
  it('uses 80px fixed sidebar width', async () => {
    const { WindowManager } = await import('./window-manager')
    const mockWindow = {
      on: vi.fn(),
      getContentSize: vi.fn(() => [1920, 1080]),
    }
    const mockTabManager = {
      setContentBounds: vi.fn(),
    }
    const wm = new WindowManager(mockWindow as any, mockTabManager as any)
    expect(wm.sidebarWidth).toBe(80)
  })

  it('sidebar is always expanded (fixed width)', async () => {
    const { WindowManager } = await import('./window-manager')
    const mockWindow = {
      on: vi.fn(),
      getContentSize: vi.fn(() => [1920, 1080]),
    }
    const mockTabManager = {
      setContentBounds: vi.fn(),
    }
    const wm = new WindowManager(mockWindow as any, mockTabManager as any)
    expect(wm.isSidebarExpanded()).toBe(true)
    // Toggle should still return true (no-op)
    expect(wm.toggleSidebar()).toBe(true)
    expect(wm.sidebarWidth).toBe(80)
  })

  it('calculates correct layout with AI panel closed', async () => {
    const { WindowManager } = await import('./window-manager')
    const mockWindow = {
      on: vi.fn(),
      getContentSize: vi.fn(() => [1920, 1080]),
    }
    const mockTabManager = {
      setContentBounds: vi.fn(),
    }
    const wm = new WindowManager(mockWindow as any, mockTabManager as any)
    const layout = wm.getLayoutInfo()
    expect(layout.sidebarWidth).toBe(80)
    expect(layout.topBarHeight).toBe(52)
    expect(layout.contentX).toBe(80)
    expect(layout.contentY).toBe(52)
    expect(layout.contentWidth).toBe(1920 - 80)
    expect(layout.contentHeight).toBe(1080 - 52)
  })

  it('calculates correct layout with AI panel open', async () => {
    const { WindowManager } = await import('./window-manager')
    const mockWindow = {
      on: vi.fn(),
      getContentSize: vi.fn(() => [1920, 1080]),
    }
    const mockTabManager = {
      setContentBounds: vi.fn(),
    }
    const wm = new WindowManager(mockWindow as any, mockTabManager as any)
    wm.toggleAiPanel()
    const layout = wm.getLayoutInfo()
    expect(layout.aiPanelOpen).toBe(true)
    expect(layout.aiPanelWidth).toBe(340)
    expect(layout.contentWidth).toBe(1920 - 80 - 340)
  })
})
