// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
vi.mock('electron', async () => {
  const { EventEmitter } = await import('node:events')
  const os = await import('node:os')
  class Contents extends EventEmitter {
    id = Math.random(); url = ''; navigationHistory = { canGoBack: () => false, canGoForward: () => false, goBack: vi.fn(), goForward: vi.fn() }
    loadURL = vi.fn(async (url: string) => { this.url = url }); getURL = () => this.url
    setWindowOpenHandler = vi.fn(); close = vi.fn(); isDestroyed = () => false
    setAudioMuted = vi.fn(); setZoomFactor = vi.fn(); executeJavaScript = vi.fn(async () => undefined)
    stop = vi.fn(); reload = vi.fn(); send = vi.fn()
  }
  const ses = { webRequest: { onBeforeRequest: vi.fn() }, setPermissionRequestHandler: vi.fn(), setPermissionCheckHandler: vi.fn(), on: vi.fn(), clearStorageData: vi.fn(async () => {}), clearCache: vi.fn(async () => {}), extensions: { loadExtension: vi.fn(), removeExtension: vi.fn() } }
  return { WebContentsView: class { webContents = new Contents(); setBounds = vi.fn() }, BrowserWindow: vi.fn(), session: { fromPartition: () => ses }, app: { getPath: () => os.tmpdir(), getAppPath: () => process.cwd(), isPackaged: true }, nativeTheme: { shouldUseDarkColors: true, on: vi.fn() }, dialog: {}, shell: {}, ipcMain: { handle: vi.fn(), removeHandler: vi.fn() } }
})
import { BrowserService } from './browser-service'

describe('BrowserService native state ownership', () => {
  let dir: string
  const window = { contentView: { addChildView: vi.fn(), removeChildView: vi.fn() }, getContentSize: () => [1200, 800], on: vi.fn(), isDestroyed: () => false, setBackgroundColor: vi.fn(), setTitleBarOverlay: vi.fn(), webContents: { send: vi.fn(), isDestroyed: () => false, id: 1, mainFrame: { url: 'app://bundle/index.html' } } }
  beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nsty-browser-test-')) })
  afterEach(() => { fs.rmSync(dir, { recursive: true, force: true }) })
  it('uses real tab IDs for creation, switching and closing', async () => {
    const service = new BrowserService(window as unknown as Electron.BrowserWindow, dir)
    const first = service.snapshot().activeTabId!
    await service.dispatch({ type: 'tab:new', url: 'example.com' })
    const second = service.snapshot().activeTabId!
    expect(second).not.toBe(first)
    expect(second).not.toMatch(/^temp-/)
    await service.dispatch({ type: 'tab:select', id: first })
    expect(service.snapshot().activeTabId).toBe(first)
    await service.dispatch({ type: 'tab:close', id: second })
    expect(service.snapshot().tabs.some(t => t.id === second)).toBe(false)
    service.dispose()
  })
  it('persists theme and bookmarks but never private tabs', async () => {
    const service = new BrowserService(window as unknown as Electron.BrowserWindow, dir)
    await service.dispatch({ type: 'preferences', patch: { theme: 'paper' } })
    await service.dispatch({ type: 'bookmark:add', url: 'example.com', title: 'Example', folder: 'Work' })
    await service.dispatch({ type: 'tab:new', url: 'https://private.test', private: true })
    service.dispose()
    const serialized = fs.readFileSync(path.join(dir, 'browser-state.json'), 'utf8')
    expect(serialized).not.toContain('private.test')
    const restored = new BrowserService(window as unknown as Electron.BrowserWindow, dir)
    expect(restored.snapshot().preferences.theme).toBe('paper')
    expect(restored.snapshot().bookmarks[0]?.title).toBe('Example')
    restored.dispose()
  })
  it('rejects IPC callers that are not the exact shell frame', async () => {
    const { ipcMain } = await import('electron')
    const service = new BrowserService(window as unknown as Electron.BrowserWindow, dir)
    service.registerIpc()
    const handler = (ipcMain.handle as unknown as { mock: { calls: [string, Function][] } }).mock.calls.find(([channel]) => channel === 'browser:getSnapshot')![1]
    const frame = { url: 'app://attacker/index.html' }
    expect(() => handler({ sender: window.webContents, senderFrame: frame })).toThrow(/Untrusted/)
    service.dispose()
  })
  it('coalesces snapshot sends into one IPC message per tick', async () => {
    const service = new BrowserService(window as unknown as Electron.BrowserWindow, dir)
    window.webContents.send.mockClear()
    await service.dispatch({ type: 'zoom', value: 1.1 })
    await service.dispatch({ type: 'zoom', value: 1.2 })
    await service.dispatch({ type: 'zoom', value: 1.3 })
    await new Promise(resolve => setImmediate(resolve))
    expect(window.webContents.send).toHaveBeenCalledTimes(1)
    expect(window.webContents.send.mock.calls[0]![1].tabs[0].zoom).toBe(1.3)
    service.dispose()
  })
  it('backs up a newer or malformed state file instead of overwriting it', () => {
    const file = path.join(dir, 'browser-state.json')
    fs.writeFileSync(file, JSON.stringify({ version: 99, future: true }))
    const service = new BrowserService(window as unknown as Electron.BrowserWindow, dir)
    service.dispose()
    const backups = fs.readdirSync(dir).filter(name => name.startsWith('browser-state.json.backup-v99'))
    expect(backups).toHaveLength(1)
    expect(JSON.parse(fs.readFileSync(path.join(dir, backups[0]!), 'utf8')).future).toBe(true)
    expect(JSON.parse(fs.readFileSync(file, 'utf8')).version).toBe(1)
  })
  it('reads unversioned v0.5.0 state files and writes version 1', () => {
    const file = path.join(dir, 'browser-state.json')
    fs.writeFileSync(file, JSON.stringify({ preferences: { theme: 'paper' }, bookmarks: [{ id: 'b', title: 'Old', url: 'https://old.test/', folder: 'Favorites' }], history: [], savedTabs: [], extensionRecords: [], permissions: [], shieldExceptions: [] }))
    const service = new BrowserService(window as unknown as Electron.BrowserWindow, dir)
    expect(service.snapshot().bookmarks[0]?.title).toBe('Old')
    service.dispose()
    expect(JSON.parse(fs.readFileSync(file, 'utf8')).version).toBe(1)
  })
  it('only restores extensions that live inside the managed extensions directory', () => {
    const file = path.join(dir, 'browser-state.json')
    const managed = path.join(dir, 'extensions', 'abc')
    fs.writeFileSync(file, JSON.stringify({ version: 1, bookmarks: [], history: [], savedTabs: [], permissions: [], shieldExceptions: [], extensionRecords: [
      { id: 'evil', path: '/tmp/anywhere', enabled: true, pinned: false, name: 'x', version: '1' },
      { id: 'ok', path: managed, enabled: false, pinned: false, name: 'y', version: '1' },
    ] }))
    const service = new BrowserService(window as unknown as Electron.BrowserWindow, dir)
    expect(service.snapshot().extensions.map(e => e.id)).toEqual(['ok'])
    service.dispose()
    const persisted = JSON.parse(fs.readFileSync(file, 'utf8')).extensionRecords.map((e: { id: string }) => e.id)
    expect(persisted).toEqual(['ok'])
  })
  it('rejects invalid native commands', async () => {
    const service = new BrowserService(window as unknown as Electron.BrowserWindow, dir)
    const result = await service.dispatch({ type: 'zoom', value: Infinity } as never)
    expect(result.ok).toBe(false)
    service.dispose()
  })
})
