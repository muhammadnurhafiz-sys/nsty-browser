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
  it('migrates legacy external extension records into the managed directory', () => {
    const legacy = path.join(dir, 'legacy-ext'); fs.mkdirSync(legacy); fs.writeFileSync(path.join(legacy, 'manifest.json'), '{}')
    fs.writeFileSync(path.join(dir, 'browser-state.json'), JSON.stringify({ version: 1, bookmarks: [], history: [], savedTabs: [], permissions: [], shieldExceptions: [], extensionRecords: [
      { id: 'legacy', path: legacy, enabled: false, pinned: false, name: 'L', version: '1' },
      { id: 'gone', path: path.join(dir, 'missing'), enabled: false, pinned: false, name: 'G', version: '1' },
    ] }))
    const service = new BrowserService(window as unknown as Electron.BrowserWindow, dir)
    service.dispose()
    const records = JSON.parse(fs.readFileSync(path.join(dir, 'browser-state.json'), 'utf8')).extensionRecords as { id: string; path: string }[]
    expect(records.map(r => r.id)).toEqual(['legacy'])
    expect(records[0]!.path.startsWith(path.join(dir, 'extensions') + path.sep)).toBe(true)
    expect(fs.existsSync(path.join(records[0]!.path, 'manifest.json'))).toBe(true)
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
  it('keeps only recent history in snapshots and searches the full bounded list', async () => {
    const service = new BrowserService(window as unknown as Electron.BrowserWindow, dir)
    const view = (service as unknown as { views: Map<string, { view: { webContents: import('node:events').EventEmitter } }> }).views.get(service.snapshot().activeTabId!)!.view
    for (let i = 0; i < 40; i++) view.webContents.emit('did-navigate', {}, `https://site-${i}.test/`)
    expect(service.snapshot().history).toHaveLength(20)
    expect(service.snapshot().history[0]?.url).toBe('https://site-39.test/')
    expect(service.searchHistory('site-3.', 10).map(h => h.url)).toEqual(['https://site-3.test/'])
    expect(service.searchHistory('', 500)).toHaveLength(40)
    service.dispose()
  })
  it('creates, switches and removes user-defined spaces, moving orphaned tabs', async () => {
    const service = new BrowserService(window as unknown as Electron.BrowserWindow, dir)
    const original = service.snapshot().activeTabId!
    expect((await service.dispatch({ type: 'space:create', name: 'Research' })).ok).toBe(true)
    let snap = service.snapshot()
    expect(snap.spaces).toContain('Research'); expect(snap.activeSpace).toBe('Research')
    const researchTab = snap.activeTabId!
    expect(researchTab).not.toBe(original)
    expect((await service.dispatch({ type: 'space:create', name: 'Research' })).ok).toBe(false)
    await service.dispatch({ type: 'space:remove', name: 'Research' })
    snap = service.snapshot()
    expect(snap.spaces).not.toContain('Research')
    expect(snap.tabs.find(t => t.id === researchTab)?.space).toBe(snap.spaces[0])
    expect((await service.dispatch({ type: 'space', name: 'Nope' })).ok).toBe(false)
    await service.dispatch({ type: 'space:create', name: 'Temp' })
    await service.dispatch({ type: 'tab:close', id: service.snapshot().activeTabId! })
    await service.dispatch({ type: 'space:remove', name: 'Temp' })
    await service.dispatch({ type: 'tab:reopen' })
    expect(service.snapshot().tabs.every(t => service.snapshot().spaces.includes(t.space))).toBe(true)
    service.dispose()
    const restored = new BrowserService(window as unknown as Electron.BrowserWindow, dir)
    expect(restored.snapshot().spaces).toEqual(['Work', 'Personal', 'Dev'])
    restored.dispose()
  })
  it('queues site permission prompts per origin, caps the queue and honours one-shot answers', async () => {
    const { session } = await import('electron')
    const ses = session.fromPartition('x') as unknown as { setPermissionRequestHandler: { mock: { calls: [Function][] } } }
    const service = new BrowserService(window as unknown as Electron.BrowserWindow, dir)
    await service.dispatch({ type: 'navigate', url: 'https://site.test/page' })
    const managed = (service as unknown as { views: Map<string, { view: { webContents: unknown } }> }).views.get(service.snapshot().activeTabId!)!
    const handler = ses.setPermissionRequestHandler.mock.calls.at(-1)![0] as (c: unknown, p: string, cb: (a: boolean) => void, d: { requestingUrl: string }) => void
    const answers: boolean[] = []
    handler(managed.view.webContents, 'geolocation', a => answers.push(a), { requestingUrl: 'https://other.test/' })
    expect(answers).toEqual([false])
    for (let i = 0; i < 6; i++) handler(managed.view.webContents, 'geolocation', a => answers.push(a), { requestingUrl: 'https://site.test/x' })
    expect(answers).toEqual([false, false])
    const pending = service.snapshot().pendingPermission!
    expect(pending.origin).toBe('https://site.test')
    await service.dispatch({ type: 'permission:respond', id: pending.id, allow: true, remember: true })
    expect(answers).toEqual([false, false, true])
    expect(service.snapshot().permissions).toEqual([{ origin: 'https://site.test', permission: 'geolocation', allowed: true }])
    expect((await service.dispatch({ type: 'permission:respond', id: pending.id, allow: true, remember: false })).ok).toBe(true)
    expect(answers).toHaveLength(3)
    service.dispose()
    expect(answers.slice(3).every(a => a === false)).toBe(true)
  })
  it('attributes blocked requests to the owning tab and honours per-site exceptions', async () => {
    const { session } = await import('electron')
    const ses = session.fromPartition('x') as unknown as { webRequest: { onBeforeRequest: { mock: { calls: [Function][] } } } }
    const service = new BrowserService(window as unknown as Electron.BrowserWindow, dir)
    await service.dispatch({ type: 'navigate', url: 'https://site.test/' })
    const active = service.snapshot().activeTabId!
    const managed = (service as unknown as { views: Map<string, { view: { webContents: { id: number } } }> }).views.get(active)!
    ;(service as unknown as { blocker: unknown }).blocker = { match: () => ({ match: true }) }
    const onBeforeRequest = ses.webRequest.onBeforeRequest.mock.calls.at(-1)![0] as (d: unknown, cb: (r: unknown) => void) => void
    const results: unknown[] = []
    onBeforeRequest({ webContentsId: managed.view.webContents.id, resourceType: 'script', url: 'https://ads.test/a.js' }, r => results.push(r))
    onBeforeRequest({ webContentsId: managed.view.webContents.id, resourceType: 'mainFrame', url: 'https://site.test/' }, r => results.push(r))
    expect(results).toEqual([{ cancel: true }, {}])
    expect(service.snapshot().tabs.find(t => t.id === active)?.blocked).toBe(1)
    await service.dispatch({ type: 'shield:site', host: 'site.test', enabled: false })
    onBeforeRequest({ webContentsId: managed.view.webContents.id, resourceType: 'script', url: 'https://ads.test/b.js' }, r => results.push(r))
    expect(results.at(-1)).toEqual({})
    service.dispose()
  })
  it('rejects invalid native commands', async () => {
    const service = new BrowserService(window as unknown as Electron.BrowserWindow, dir)
    const result = await service.dispatch({ type: 'zoom', value: Infinity } as never)
    expect(result.ok).toBe(false)
    service.dispose()
  })
})
