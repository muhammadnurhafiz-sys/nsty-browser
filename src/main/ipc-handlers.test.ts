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

vi.mock('./ai/claude-client', () => ({}))
vi.mock('./ai/page-context', () => ({ extractPageContext: vi.fn(async () => 'page text') }))
vi.mock('./updater', () => ({ downloadUpdate: vi.fn(), installUpdate: vi.fn() }))

import { ipcMain } from 'electron'
import { registerIpcHandlers } from './ipc-handlers'
import { downloadUpdate, installUpdate } from './updater'

function getOnHandler(channel: string): Function | undefined {
  const calls = (ipcMain as any)._onCalls as [string, Function][]
  return calls.find(([ch]) => ch === channel)?.[1]
}
function getHandleHandler(channel: string): Function | undefined {
  const calls = (ipcMain as any)._handleCalls as [string, Function][]
  return calls.find(([ch]) => ch === channel)?.[1]
}

// Trusted sender frame shape expected by security/ipc-guard.
const trustedEvent = { senderFrame: { url: 'app://bundle/index.html' }, sender: { send: vi.fn() } }

describe('IPC handlers (AI + updater only; browser state lives in BrowserService)', () => {
  const view = { webContents: {} }
  const browser = { getActiveView: vi.fn(() => view) }
  const claude = { sendMessage: vi.fn(async () => undefined), setApiKey: vi.fn(), isReady: vi.fn(() => true) }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(ipcMain as any)._onCalls.length = 0
    ;(ipcMain as any)._handleCalls.length = 0
    registerIpcHandlers(browser as any, claude as any)
  })

  it('does not register legacy tab, overlay, sidebar or session channels', () => {
    for (const channel of ['tab:create', 'tab:close', 'tab:switch', 'tab:navigate', 'overlay:show', 'overlay:hide', 'sidebar:toggle', 'space:switch']) {
      expect(getOnHandler(channel)).toBeUndefined()
    }
    expect(getHandleHandler('session:getSpaces')).toBeUndefined()
    expect(getHandleHandler('layout:info')).toBeUndefined()
  })

  it('sends AI messages with page context from the active native view', async () => {
    await getOnHandler('ai:send')!(trustedEvent, 'hello', null)
    expect(browser.getActiveView).toHaveBeenCalledTimes(1)
    expect(claude.sendMessage).toHaveBeenCalledWith('hello', null, 'page text', 'sonnet')
  })

  it('wires API key and readiness', async () => {
    getOnHandler('ai:setApiKey')!(trustedEvent, 'sk-test')
    expect(claude.setApiKey).toHaveBeenCalledWith('sk-test')
    expect(await getHandleHandler('ai:isReady')!(trustedEvent)).toBe(true)
  })

  it('wires updater channels', () => {
    getOnHandler('update:download')!(trustedEvent)
    getOnHandler('update:install')!(trustedEvent)
    expect(downloadUpdate).toHaveBeenCalledTimes(1)
    expect(installUpdate).toHaveBeenCalledTimes(1)
  })
})
