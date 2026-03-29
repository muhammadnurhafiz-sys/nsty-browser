import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('electron', () => {
  const onCalls: [string, Function][] = []
  const handleCalls: [string, Function][] = []
  return {
    ipcMain: {
      on: vi.fn((channel: string, handler: Function) => onCalls.push([channel, handler])),
      handle: vi.fn((channel: string, handler: Function) => handleCalls.push([channel, handler])),
      _onCalls: onCalls,
      _handleCalls: handleCalls,
    },
  }
})

vi.mock('./tab-manager', () => ({}))
vi.mock('./window-manager', () => ({}))
vi.mock('./ai/claude-client', () => ({}))
vi.mock('./ai/page-context', () => ({ extractPageContext: vi.fn() }))
vi.mock('./updater', () => ({ downloadUpdate: vi.fn(), installUpdate: vi.fn() }))

import { ipcMain } from 'electron'
import { registerIpcHandlers } from './ipc-handlers'

function createMockTabManager() {
  return {
    createTab: vi.fn().mockReturnValue({ id: 'tab-1' }),
    closeTab: vi.fn(),
    switchTab: vi.fn(),
    navigateTo: vi.fn(),
    goBack: vi.fn(),
    goForward: vi.fn(),
    reload: vi.fn(),
    switchSpace: vi.fn(),
    getActiveView: vi.fn(),
    hideActiveView: vi.fn(),
    showActiveView: vi.fn(),
  }
}

function createMockWindowManager() {
  return {
    updateLayout: vi.fn(),
    toggleSidebar: vi.fn().mockReturnValue(true),
    getLayoutInfo: vi.fn().mockReturnValue({}),
  }
}

function getOnHandler(channel: string): Function | undefined {
  const calls = (ipcMain as any)._onCalls as [string, Function][]
  return calls.find(([ch]) => ch === channel)?.[1]
}

describe('IPC Handlers', () => {
  let mockTabManager: ReturnType<typeof createMockTabManager>
  let mockWindowManager: ReturnType<typeof createMockWindowManager>

  beforeEach(() => {
    vi.clearAllMocks()
    ;(ipcMain as any)._onCalls.length = 0
    ;(ipcMain as any)._handleCalls.length = 0
    mockTabManager = createMockTabManager()
    mockWindowManager = createMockWindowManager()
    registerIpcHandlers(mockTabManager as any, mockWindowManager as any)
  })

  describe('overlay:show', () => {
    it('should register the overlay:show handler', () => {
      const handler = getOnHandler('overlay:show')
      expect(handler).toBeDefined()
    })

    it('should call tabManager.hideActiveView', () => {
      const handler = getOnHandler('overlay:show')!
      handler({})
      expect(mockTabManager.hideActiveView).toHaveBeenCalledTimes(1)
    })
  })

  describe('overlay:hide', () => {
    it('should register the overlay:hide handler', () => {
      const handler = getOnHandler('overlay:hide')
      expect(handler).toBeDefined()
    })

    it('should call tabManager.showActiveView and windowManager.updateLayout', () => {
      const handler = getOnHandler('overlay:hide')!
      handler({})
      expect(mockTabManager.showActiveView).toHaveBeenCalledTimes(1)
      expect(mockWindowManager.updateLayout).toHaveBeenCalledTimes(1)
    })
  })
})
