import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Electron with class-based BrowserView
vi.mock('electron', () => {
  class MockBrowserView {
    webContents = {
      on: vi.fn(),
      loadURL: vi.fn().mockResolvedValue(undefined),
      close: vi.fn(),
      canGoBack: vi.fn().mockReturnValue(false),
      canGoForward: vi.fn().mockReturnValue(false),
      goBack: vi.fn(),
      goForward: vi.fn(),
      reload: vi.fn(),
      getTitle: vi.fn().mockReturnValue('Test'),
      setWindowOpenHandler: vi.fn(),
    }
    setBounds = vi.fn()
  }
  return {
    BrowserView: MockBrowserView,
    BrowserWindow: vi.fn(),
    shell: { openExternal: vi.fn().mockResolvedValue(undefined) },
  }
})

vi.mock('crypto', () => ({
  randomUUID: vi.fn().mockReturnValue('test-uuid-1'),
}))

import { TabManager } from './tab-manager'

function createMockWindow() {
  return {
    addBrowserView: vi.fn(),
    removeBrowserView: vi.fn(),
    getContentBounds: vi.fn().mockReturnValue({ x: 0, y: 0, width: 1200, height: 800 }),
    webContents: { send: vi.fn() },
  } as unknown as Electron.BrowserWindow
}

describe('TabManager', () => {
  let tabManager: TabManager
  let mockWindow: ReturnType<typeof createMockWindow>

  beforeEach(() => {
    vi.clearAllMocks()
    mockWindow = createMockWindow()
    tabManager = new TabManager(mockWindow as any)
  })

  describe('hideActiveView', () => {
    it('should remove the active BrowserView from the window', () => {
      tabManager.createTab('https://google.com', 'space-1')
      mockWindow.removeBrowserView.mockClear()

      tabManager.hideActiveView()

      expect(mockWindow.removeBrowserView).toHaveBeenCalledTimes(1)
    })

    it('should do nothing when no active tab exists', () => {
      mockWindow.removeBrowserView.mockClear()

      tabManager.hideActiveView()

      expect(mockWindow.removeBrowserView).not.toHaveBeenCalled()
    })
  })

  describe('showActiveView', () => {
    it('should re-add the active BrowserView to the window', () => {
      tabManager.createTab('https://google.com', 'space-1')
      tabManager.hideActiveView()
      mockWindow.addBrowserView.mockClear()

      tabManager.showActiveView()

      expect(mockWindow.addBrowserView).toHaveBeenCalledTimes(1)
    })

    it('should do nothing when no active tab exists', () => {
      mockWindow.addBrowserView.mockClear()

      tabManager.showActiveView()

      expect(mockWindow.addBrowserView).not.toHaveBeenCalled()
    })
  })
})
