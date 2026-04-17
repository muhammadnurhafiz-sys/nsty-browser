import { describe, it, expect, vi, } from 'vitest'

// Mock electron
vi.mock('electron', () => ({
  BrowserWindow: vi.fn(),
}))

// Mock tab-manager
vi.mock('./tab-manager', () => ({
  TabManager: vi.fn(),
}))

describe('WindowManager', () => {
  it('defaults to collapsed sidebar (60px)', async () => {
    const { WindowManager } = await import('./window-manager')
    const mockWindow = {
      on: vi.fn(),
      getContentSize: vi.fn(() => [1920, 1080]),
    }
    const mockTabManager = {
      setContentBounds: vi.fn(),
    }
    const wm = new WindowManager(mockWindow as any, mockTabManager as any)
    expect(wm.sidebarWidth).toBe(60)
  })

  it('toggles sidebar between 60px and 240px', async () => {
    const { WindowManager } = await import('./window-manager')
    const mockWindow = {
      on: vi.fn(),
      getContentSize: vi.fn(() => [1920, 1080]),
    }
    const mockTabManager = {
      setContentBounds: vi.fn(),
    }
    const wm = new WindowManager(mockWindow as any, mockTabManager as any)
    expect(wm.isSidebarExpanded()).toBe(false)
    expect(wm.toggleSidebar()).toBe(true)
    expect(wm.sidebarWidth).toBe(240)
    expect(wm.toggleSidebar()).toBe(false)
    expect(wm.sidebarWidth).toBe(60)
  })

  it('calculates correct layout — full height, no top bar', async () => {
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
    expect(layout.sidebarWidth).toBe(60)
    expect(layout.contentX).toBe(60)
    expect(layout.contentY).toBe(0)
    expect(layout.contentWidth).toBe(1920 - 60)
    expect(layout.contentHeight).toBe(1080)
  })
})
