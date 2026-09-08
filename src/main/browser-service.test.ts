// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
const { logCalls } = vi.hoisted(() => ({ logCalls: [] as unknown[][] }))
vi.mock('./utils/logger', () => {
  const record = (...args: unknown[]) => { logCalls.push(args) }
  return { createLogger: () => ({ debug: record, info: record, warn: record, error: record }) }
})
vi.mock('electron', async () => {
  const { EventEmitter } = await import('node:events')
  const os = await import('node:os')
  class Contents extends EventEmitter {
    id = Math.random(); url = ''; navigationHistory = { canGoBack: () => false, canGoForward: () => false, goBack: vi.fn(), goForward: vi.fn() }
    loadURL = vi.fn(async (url: string) => { this.url = url }); getURL = () => this.url
    setWindowOpenHandler = vi.fn(); close = vi.fn(); isDestroyed = () => false
    setAudioMuted = vi.fn(); setZoomFactor = vi.fn(); executeJavaScript = vi.fn(async () => undefined)
    stop = vi.fn(); reload = vi.fn(); send = vi.fn(); stopFindInPage = vi.fn(); findInPage = vi.fn()
    focus = vi.fn(); isFocused = () => false
    reloadIgnoringCache = vi.fn(); copy = vi.fn(); cut = vi.fn(); paste = vi.fn(); selectAll = vi.fn()
    inspectElement = vi.fn(); openDevTools = vi.fn(); isDevToolsOpened = () => false; downloadURL = vi.fn()
  }
  const ses = { webRequest: { onBeforeRequest: vi.fn() }, setPermissionRequestHandler: vi.fn(), setPermissionCheckHandler: vi.fn(), on: vi.fn(), clearStorageData: vi.fn(async () => {}), clearCache: vi.fn(async () => {}), extensions: { loadExtension: vi.fn(), removeExtension: vi.fn() } }
  return { WebContentsView: class { webContents = new Contents(); setBounds = vi.fn(); setBackgroundColor = vi.fn() }, BrowserWindow: vi.fn(), session: { fromPartition: () => ses }, app: { getPath: () => os.tmpdir(), getAppPath: () => process.cwd(), isPackaged: true }, nativeTheme: { shouldUseDarkColors: true, on: vi.fn() }, dialog: {}, shell: { openExternal: vi.fn(async () => undefined) }, clipboard: { writeText: vi.fn() }, ipcMain: { handle: vi.fn(), removeHandler: vi.fn() } }
})
import { BrowserService } from './browser-service'

describe('BrowserService native state ownership', () => {
  let dir: string
  const window = { contentView: { addChildView: vi.fn(), removeChildView: vi.fn() }, getContentSize: () => [1200, 800], on: vi.fn(), isDestroyed: () => false, setBackgroundColor: vi.fn(), setTitleBarOverlay: vi.fn(), setFullScreen: vi.fn(), isFullScreen: () => false, webContents: { send: vi.fn(), isDestroyed: () => false, id: 1, mainFrame: { url: 'app://bundle/index.html' } } }
  type Emitters = Map<string, { tab: { id: string }; view: { webContents: import('node:events').EventEmitter & Record<string, ReturnType<typeof vi.fn>>; setBounds: ReturnType<typeof vi.fn> } }>
  const viewsOf = (service: BrowserService): Emitters => (service as unknown as { views: Emitters }).views
  const activeView = (service: BrowserService) => viewsOf(service).get(service.snapshot().activeTabId!)!.view
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
  it('tracks favicon, audio and find state per tab', async () => {
    const service = new BrowserService(window as unknown as Electron.BrowserWindow, dir)
    await service.dispatch({ type: 'navigate', url: 'https://site.test/' })
    const id = service.snapshot().activeTabId!
    const wc = (service as unknown as { views: Map<string, { view: { webContents: import('node:events').EventEmitter } }> }).views.get(id)!.view.webContents
    wc.emit('page-favicon-updated', {}, ['https://site.test/favicon.ico', 'https://site.test/other.png'])
    wc.emit('audio-state-changed', { audible: true })
    await service.dispatch({ type: 'find', text: 'notify' })
    wc.emit('found-in-page', {}, { activeMatchOrdinal: 3, matches: 12, finalUpdate: true })
    let tab = service.snapshot().tabs.find(t => t.id === id)!
    expect(tab.favicon).toBe('https://site.test/favicon.ico')
    expect(tab.audible).toBe(true)
    expect(tab.find).toEqual({ active: 3, total: 12 })
    await service.dispatch({ type: 'find', text: '' })
    wc.emit('audio-state-changed', { audible: false })
    tab = service.snapshot().tabs.find(t => t.id === id)!
    expect(tab.find).toBeNull(); expect(tab.audible).toBe(false)
    wc.emit('page-favicon-updated', {}, ['javascript:alert(1)'])
    expect(service.snapshot().tabs.find(t => t.id === id)!.favicon).toBeNull()
    service.dispose()
  })
  it('lays out the native view from the rect the renderer reports', async () => {
    const service = new BrowserService(window as unknown as Electron.BrowserWindow, dir)
    await service.dispatch({ type: 'navigate', url: 'https://site.test/' })
    const view = (service as unknown as { views: Map<string, { view: { setBounds: { mock: { calls: [unknown][] } } } }> }).views.get(service.snapshot().activeTabId!)!.view
    await service.dispatch({ type: 'layout', x: 64, y: 54 })
    expect(view.setBounds.mock.calls.at(-1)![0]).toEqual({ x: 64, y: 54, width: 1136, height: 746 })
    service.dispose()
  })
  it('keeps the live page attached under an overlay and layers the overlay view on top', async () => {
    const service = new BrowserService(window as unknown as Electron.BrowserWindow, dir, { shellUrl: 'app://bundle/index.html' })
    await service.dispatch({ type: 'navigate', url: 'https://site.test/' })
    const page = (service as unknown as { views: Map<string, { view: unknown }> }).views.get(service.snapshot().activeTabId!)!.view
    window.contentView.addChildView.mockClear(); window.contentView.removeChildView.mockClear()
    await service.dispatch({ type: 'overlay:open', surface: 'settings' })
    const overlayView = (service as unknown as { overlayView: { webContents: { focus: { mock: { calls: unknown[] } } } } }).overlayView
    expect(overlayView).toBeTruthy()
    const added = window.contentView.addChildView.mock.calls.map(c => c[0])
    expect(added).toContain(page)
    expect(added.at(-1)).toBe(overlayView)
    expect(service.snapshot().overlay).toMatchObject({ surface: 'settings', anchor: null })
    expect(overlayView.webContents.focus).toHaveBeenCalled()
    window.contentView.addChildView.mockClear(); window.contentView.removeChildView.mockClear()
    await service.dispatch({ type: 'overlay:close' })
    expect(service.snapshot().overlay).toBeNull()
    expect(window.contentView.addChildView.mock.calls.map(c => c[0])).toContain(page)
    expect(window.contentView.addChildView.mock.calls.map(c => c[0])).not.toContain(overlayView)
    expect(window.contentView.removeChildView.mock.calls.map(c => c[0])).toContain(overlayView)
    service.dispose()
  })
  it('builds omnibox suggestions, clamps the highlight and navigates on accept', async () => {
    const service = new BrowserService(window as unknown as Electron.BrowserWindow, dir, { shellUrl: 'app://bundle/index.html' })
    const anchor = { x: 300, y: 10, width: 400, height: 34 }
    await service.dispatch({ type: 'suggest', query: 'google.com', anchor })
    let overlay = service.snapshot().overlay!
    expect(overlay.surface).toBe('suggestions')
    expect(overlay.anchor).toEqual(anchor)
    expect(overlay.payload.rows![0]).toEqual({ kind: 'url', title: 'Go to google.com', url: 'https://google.com/' })
    expect(overlay.payload.rows![1]!.kind).toBe('search')
    await service.dispatch({ type: 'suggest:highlight', index: 99 })
    overlay = service.snapshot().overlay!
    expect(overlay.payload.highlight).toBe(overlay.payload.rows!.length - 1)
    await service.dispatch({ type: 'suggest:highlight', index: 0 })
    const wc = (service as unknown as { views: Map<string, { view: { webContents: { loadURL: { mock: { calls: string[][] } } } } }> }).views.get(service.snapshot().activeTabId!)!.view.webContents
    await service.dispatch({ type: 'suggest:accept' })
    expect(wc.loadURL.mock.calls.at(-1)![0]).toBe('https://google.com/')
    expect(service.snapshot().overlay).toBeNull()
    await service.dispatch({ type: 'suggest', query: 'hello world', anchor })
    expect(service.snapshot().overlay!.payload.rows![0]!.kind).toBe('search')
    service.dispose()
  })
  it('shows a permission surface that cannot be dismissed until it is answered', async () => {
    const { session } = await import('electron')
    const ses = session.fromPartition('x') as unknown as { setPermissionRequestHandler: { mock: { calls: [Function][] } } }
    const service = new BrowserService(window as unknown as Electron.BrowserWindow, dir, { shellUrl: 'app://bundle/index.html' })
    await service.dispatch({ type: 'navigate', url: 'https://site.test/page' })
    const managed = (service as unknown as { views: Map<string, { view: { webContents: unknown } }> }).views.get(service.snapshot().activeTabId!)!
    const handler = ses.setPermissionRequestHandler.mock.calls.at(-1)![0] as (c: unknown, p: string, cb: (a: boolean) => void, d: { requestingUrl: string }) => void
    handler(managed.view.webContents, 'geolocation', () => undefined, { requestingUrl: 'https://site.test/x' })
    expect(service.snapshot().overlay?.surface).toBe('permission')
    await service.dispatch({ type: 'overlay:close' })
    expect(service.snapshot().overlay?.surface).toBe('permission')
    const pending = service.snapshot().pendingPermission!
    await service.dispatch({ type: 'permission:respond', id: pending.id, allow: false, remember: false })
    expect(service.snapshot().overlay).toBeNull()
    service.dispose()
  })
  it('trusts the overlay web contents and still rejects foreign frames', async () => {
    const { ipcMain } = await import('electron')
    const service = new BrowserService(window as unknown as Electron.BrowserWindow, dir, { shellUrl: 'app://bundle/index.html' })
    service.registerIpc()
    await service.dispatch({ type: 'overlay:open', surface: 'menu' })
    const overlayWc = (service as unknown as { overlayView: { webContents: unknown } }).overlayView.webContents
    const handler = (ipcMain.handle as unknown as { mock: { calls: [string, Function][] } }).mock.calls.filter(([channel]) => channel === 'browser:getSnapshot').at(-1)![1]
    expect(() => handler({ sender: overlayWc, senderFrame: { url: 'app://bundle/index.html#overlay' } })).not.toThrow()
    expect(() => handler({ sender: overlayWc, senderFrame: { url: 'https://attacker.test/' } })).toThrow(/Untrusted/)
    service.dispose()
  })
  it('closes the overlay when the tab it acts on is closed', async () => {
    const service = new BrowserService(window as unknown as Electron.BrowserWindow, dir, { shellUrl: 'app://bundle/index.html' })
    const id = service.snapshot().activeTabId!
    await service.dispatch({ type: 'overlay:open', surface: 'tabs', payload: { tabId: id } })
    expect(service.snapshot().overlay?.surface).toBe('tabs')
    await service.dispatch({ type: 'tab:close', id })
    expect(service.snapshot().overlay).toBeNull()
    service.dispose()
  })
  it('opens a page context menu at the clicked point, offset by the content origin', async () => {
    const service = new BrowserService(window as unknown as Electron.BrowserWindow, dir, { shellUrl: 'app://bundle/index.html' })
    await service.dispatch({ type: 'navigate', url: 'https://site.test/' })
    await service.dispatch({ type: 'layout', x: 240, y: 54 })
    activeView(service).webContents.emit('context-menu', {}, { x: 100, y: 200, linkURL: 'https://link.test/', srcURL: '', mediaType: 'none', selectionText: 'x'.repeat(500), isEditable: false, editFlags: { canCopy: true, canPaste: false, canCut: false, canSelectAll: true } })
    const overlay = service.snapshot().overlay!
    expect(overlay.surface).toBe('context')
    expect(overlay.anchor).toEqual({ x: 340, y: 254, width: 0, height: 0 })
    expect(overlay.payload).toMatchObject({ x: 100, y: 200, linkURL: 'https://link.test/', mediaType: 'none', isEditable: false, canCopy: true, canPaste: false })
    expect(String(overlay.payload.selectionText)).toHaveLength(200)
    service.dispose()
  })
  it('opens a context-menu link in a background tab and refuses unsafe clipboard writes', async () => {
    const { clipboard } = await import('electron')
    const service = new BrowserService(window as unknown as Electron.BrowserWindow, dir, { shellUrl: 'app://bundle/index.html' })
    await service.dispatch({ type: 'navigate', url: 'https://site.test/' })
    const active = service.snapshot().activeTabId!
    await service.dispatch({ type: 'context', command: 'open-link', url: 'https://other.test/' })
    expect(service.snapshot().activeTabId).toBe(active)
    expect(service.snapshot().tabs.some(t => t.url === 'https://other.test/')).toBe(true)
    expect(service.snapshot().overlay).toBeNull()
    ;(clipboard.writeText as unknown as { mockClear: () => void }).mockClear()
    await service.dispatch({ type: 'context', command: 'copy-link', url: 'javascript:alert(1)' })
    expect(clipboard.writeText).not.toHaveBeenCalled()
    await service.dispatch({ type: 'context', command: 'copy-link', url: 'https://link.test/' })
    expect(clipboard.writeText).toHaveBeenCalledWith('https://link.test/')
    await service.dispatch({ type: 'context', command: 'inspect', x: 12, y: 34 })
    expect(activeView(service).webContents.inspectElement).toHaveBeenCalledWith(12, 34)
    service.dispose()
  })
  it('handles browser shortcuts in main for pages and chrome alike', async () => {
    const service = new BrowserService(window as unknown as Electron.BrowserWindow, dir, { shellUrl: 'app://bundle/index.html' })
    await service.dispatch({ type: 'navigate', url: 'https://one.test/' })
    const first = service.snapshot().activeTabId!
    await service.dispatch({ type: 'tab:new', url: 'https://two.test/' })
    const second = service.snapshot().activeTabId!
    await service.dispatch({ type: 'shortcut', key: 'Tab', ctrl: true, shift: false, alt: false, meta: false })
    expect(service.snapshot().activeTabId).toBe(first)
    await service.dispatch({ type: 'shortcut', key: 'Tab', ctrl: true, shift: true, alt: false, meta: false })
    expect(service.snapshot().activeTabId).toBe(second)
    const wc = activeView(service).webContents as unknown as { navigationHistory: { goBack: ReturnType<typeof vi.fn> }; loadURL: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn> }
    wc.navigationHistory.canGoBack = () => true
    await service.dispatch({ type: 'shortcut', key: 'ArrowLeft', ctrl: false, shift: false, alt: true, meta: false })
    expect(wc.navigationHistory.goBack).toHaveBeenCalled()
    await service.dispatch({ type: 'shortcut', key: '=', ctrl: true, shift: false, alt: false, meta: false })
    expect(service.snapshot().tabs.find(t => t.id === second)!.zoom).toBeCloseTo(1.1)
    wc.loadURL.mockClear()
    await service.dispatch({ type: 'shortcut', key: 'F5', ctrl: false, shift: false, alt: false, meta: false })
    expect(wc.loadURL).toHaveBeenCalled()
    await service.dispatch({ type: 'shortcut', key: 'Escape', ctrl: false, shift: false, alt: false, meta: false })
    expect(wc.stop).toHaveBeenCalled()
    await service.dispatch({ type: 'shortcut', key: 'l', ctrl: true, shift: false, alt: false, meta: false })
    expect(window.webContents.send).toHaveBeenCalledWith('browser:shortcut', 'l')
    service.dispose()
  })
  it('opens window.open targets in the background or the foreground by disposition', async () => {
    const service = new BrowserService(window as unknown as Electron.BrowserWindow, dir)
    await service.dispatch({ type: 'navigate', url: 'https://site.test/' })
    const active = service.snapshot().activeTabId!
    const handler = (activeView(service).webContents as unknown as { setWindowOpenHandler: { mock: { calls: [(d: { url: string; disposition: string }) => unknown][] } } }).setWindowOpenHandler.mock.calls.at(-1)![0]
    handler({ url: 'https://background.test/', disposition: 'background-tab' })
    expect(service.snapshot().activeTabId).toBe(active)
    handler({ url: 'https://foreground.test/', disposition: 'foreground-tab' })
    expect(service.snapshot().activeTabId).not.toBe(active)
    expect(service.snapshot().tabs.find(t => t.id === service.snapshot().activeTabId)!.url).toBe('https://foreground.test/')
    service.dispose()
  })
  it('gives the page the whole window while it is in HTML fullscreen', async () => {
    const service = new BrowserService(window as unknown as Electron.BrowserWindow, dir)
    await service.dispatch({ type: 'navigate', url: 'https://video.test/' })
    const view = activeView(service)
    window.setFullScreen.mockClear()
    view.webContents.emit('enter-html-full-screen')
    expect(window.setFullScreen).toHaveBeenCalledWith(true)
    expect(view.setBounds.mock.calls.at(-1)![0]).toEqual({ x: 0, y: 0, width: 1200, height: 800 })
    view.webContents.emit('leave-html-full-screen')
    expect(window.setFullScreen).toHaveBeenCalledWith(false)
    expect(view.setBounds.mock.calls.at(-1)![0]).toEqual({ x: 240, y: 54, width: 960, height: 746 })
    service.dispose()
  })
  it('hands mail links to the operating system and still blocks other schemes', async () => {
    const { shell } = await import('electron')
    const service = new BrowserService(window as unknown as Electron.BrowserWindow, dir)
    await service.dispatch({ type: 'navigate', url: 'https://site.test/' })
    ;(shell.openExternal as unknown as { mockClear: () => void }).mockClear()
    const wc = activeView(service).webContents
    const mail = { preventDefault: vi.fn() }
    wc.emit('will-navigate', mail, 'mailto:someone@example.com')
    expect(mail.preventDefault).toHaveBeenCalled()
    expect(shell.openExternal).toHaveBeenCalledWith('mailto:someone@example.com')
    const script = { preventDefault: vi.fn() }
    wc.emit('will-navigate', script, 'javascript:alert(1)')
    expect(script.preventDefault).toHaveBeenCalled()
    expect(shell.openExternal).toHaveBeenCalledTimes(1)
    service.dispose()
  })
  it('prompts for HTTP credentials without ever logging them', async () => {
    const service = new BrowserService(window as unknown as Electron.BrowserWindow, dir, { shellUrl: 'app://bundle/index.html' })
    await service.dispatch({ type: 'navigate', url: 'https://site.test/' })
    const answers: unknown[][] = []
    const event = { preventDefault: vi.fn() }
    activeView(service).webContents.emit('login', event, {}, { host: 'site.test', realm: 'Staging', isProxy: false }, (...args: unknown[]) => answers.push(args))
    expect(event.preventDefault).toHaveBeenCalled()
    let overlay = service.snapshot().overlay!
    expect(overlay.surface).toBe('auth')
    expect(overlay.payload).toMatchObject({ host: 'site.test', realm: 'Staging', isProxy: false })
    await service.dispatch({ type: 'overlay:close' })
    expect(service.snapshot().overlay!.surface).toBe('auth')
    await service.dispatch({ type: 'auth:respond', id: String(overlay.payload.id), username: 'ada', password: 'sup3r-s3cret' })
    expect(answers).toEqual([['ada', 'sup3r-s3cret']])
    expect(service.snapshot().overlay).toBeNull()
    expect(JSON.stringify(logCalls)).not.toContain('sup3r-s3cret')
    activeView(service).webContents.emit('login', { preventDefault: vi.fn() }, {}, { host: 'site.test', isProxy: false }, (...args: unknown[]) => answers.push(args))
    overlay = service.snapshot().overlay!
    await service.dispatch({ type: 'auth:respond', id: String(overlay.payload.id) })
    expect(answers[1]).toEqual([])
    service.dispose()
  })
  it('explains certificate failures in the error page text', async () => {
    const service = new BrowserService(window as unknown as Electron.BrowserWindow, dir)
    await service.dispatch({ type: 'navigate', url: 'https://bad-cert.test/' })
    const id = service.snapshot().activeTabId!
    activeView(service).webContents.emit('did-fail-load', {}, -202, 'ERR_CERT_AUTHORITY_INVALID', 'https://bad-cert.test/', true)
    const error = service.snapshot().tabs.find(t => t.id === id)!.error!
    expect(error).toContain('certificate could not be verified')
    expect(error).toContain('ERR_CERT_AUTHORITY_INVALID')
    service.dispose()
  })
  it('keeps an open surface in step with a new content origin and the tab it describes', async () => {
    const service = new BrowserService(window as unknown as Electron.BrowserWindow, dir, { shellUrl: 'app://bundle/index.html' })
    await service.dispatch({ type: 'overlay:open', surface: 'menu' })
    await service.dispatch({ type: 'layout', x: 64, y: 54 })
    expect(service.snapshot().overlay!.origin).toEqual({ x: 64, y: 54 })
    await service.dispatch({ type: 'overlay:open', surface: 'find' })
    await service.dispatch({ type: 'tab:close', id: service.snapshot().activeTabId! })
    expect(service.snapshot().overlay).toBeNull()
    service.dispose()
  })
  it('rejects invalid native commands', async () => {
    const service = new BrowserService(window as unknown as Electron.BrowserWindow, dir)
    const result = await service.dispatch({ type: 'zoom', value: Infinity } as never)
    expect(result.ok).toBe(false)
    service.dispose()
  })
})
