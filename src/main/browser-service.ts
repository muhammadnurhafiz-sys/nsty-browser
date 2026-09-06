import { app, BrowserWindow, WebContentsView, dialog, ipcMain, nativeTheme, session, shell } from 'electron'
import type { DownloadItem, Session, WebContents } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { ElectronBlocker, fromElectronDetails } from '@ghostery/adblocker-electron'
import fetch from 'cross-fetch'
import { DEFAULT_BROWSER_PREFERENCES } from '../shared/browser'
import type { BrowserAction, BrowserActionResult, BrowserHistoryEntry, BrowserSnapshot, BrowserTab, BrowserPermission, BrowserExtension } from '../shared/browser'
import { MAX_SPACES, isShellUrl, isSpaceName, normalizeAddress, persistableTabs, validateBrowserAction } from '../shared/browser-policy'
import { createLogger } from './utils/logger'

const log = createLogger('browser')
const STATE_VERSION = 1
const DEFAULT_SPACES = ['Work', 'Personal', 'Dev']
const RECENT_HISTORY = 20
const HISTORY_LIMIT = 500
let youtubeScript: string | null = null
interface ManagedTab { tab: BrowserTab; view: WebContentsView }
interface ExtensionRecord { path: string; id: string; enabled: boolean; pinned: boolean; name: string; version: string }
interface PendingPermission { request: BrowserPermission; callback: (allow: boolean) => void; timer: ReturnType<typeof setTimeout> }

export class BrowserService {
  private readonly views = new Map<string, ManagedTab>()
  private readonly sessions = new Set<Session>()
  private readonly downloadItems = new Map<string, DownloadItem>()
  private readonly permissionQueue: PendingPermission[] = []
  private extensionRecords: ExtensionRecord[] = []
  private closedTabs: { url: string; space: string }[] = []
  private overlayOpen = false
  private blocker: ElectronBlocker | null = null
  private saveTimer: ReturnType<typeof setTimeout> | null = null
  private sendScheduled = false
  private disposed = false
  private restoring = true
  private privatePartition = `private-${randomUUID()}`
  private state: BrowserSnapshot = {
    revision: 0, tabs: [], activeTabId: null, activeSpace: 'Work', spaces: [...DEFAULT_SPACES], preferences: { ...DEFAULT_BROWSER_PREFERENCES },
    bookmarks: [], history: [], downloads: [], extensions: [], pendingPermission: null, permissions: [],
    shieldExceptions: [], shieldReady: false, capabilities: { extensions: true, privateBrowsing: true },
  }

  constructor(private readonly window: BrowserWindow, private readonly storageDir = app.getPath('userData')) {
    log.info('initialize main-owned browser state')
    const restored = this.readState()
    if (restored && validateBrowserAction({ type: 'preferences', patch: restored.preferences })) this.state.preferences = { ...DEFAULT_BROWSER_PREFERENCES, ...restored.preferences }
    this.state.bookmarks = (restored?.bookmarks ?? []).filter(b => typeof b.id === 'string' && typeof b.title === 'string' && typeof b.folder === 'string' && /^https?:\/\//.test(b.url))
    this.state.history = (restored?.history ?? []).filter(h => typeof h.id === 'string' && typeof h.title === 'string' && typeof h.visitedAt === 'number' && /^https?:\/\//.test(h.url)).slice(0, HISTORY_LIMIT)
    this.state.shieldExceptions = (restored?.shieldExceptions ?? []).filter(h => typeof h === 'string' && /^[a-z\d.-]+$/i.test(h))
    this.state.permissions = (restored?.permissions ?? []).filter(p => typeof p.origin === 'string' && typeof p.permission === 'string' && typeof p.allowed === 'boolean')
    this.extensionRecords = (restored?.extensionRecords ?? []).filter(e => typeof e.id === 'string' && typeof e.path === 'string' && this.isManagedExtensionPath(e.path))
    const spaces = [...new Set((restored?.spaces ?? []).filter(name => typeof name === 'string' && isSpaceName(name)))].slice(0, MAX_SPACES)
    if (spaces.length) this.state.spaces = spaces
    this.state.activeSpace = this.state.spaces[0]!
    if (this.state.preferences.restoreTabs) {
      for (const entry of (restored?.savedTabs ?? []).slice(0, 50)) {
        try { this.createTab(entry.url, false, this.state.spaces.includes(entry.space) ? entry.space : this.state.spaces[0]!) } catch { log.warn('skip invalid saved tab') }
      }
    }
    if (!this.views.size) this.createTab('nsty://newtab')
    this.restoring = false
    this.window.on('resize', () => this.layout())
    this.applyTheme()
  }

  snapshot(): BrowserSnapshot {
    return structuredClone({ ...this.state, history: this.state.history.slice(0, RECENT_HISTORY), tabs: [...this.views.values()].map(v => ({ ...v.tab })) })
  }

  /** Bounded, case-insensitive search over the full history; never part of a snapshot. */
  searchHistory(query: string, limit = 50): BrowserHistoryEntry[] {
    log.debug('search history')
    const needle = query.trim().toLowerCase().slice(0, 200)
    const max = Math.min(Math.max(1, Math.floor(limit) || 50), HISTORY_LIMIT)
    const hits = needle ? this.state.history.filter(h => `${h.title} ${h.url}`.toLowerCase().includes(needle)) : this.state.history
    return structuredClone(hits.slice(0, max))
  }

  private readState(): (Partial<BrowserSnapshot> & { savedTabs?: { url: string; space: string }[]; extensionRecords?: ExtensionRecord[] }) | null {
    const file = path.join(this.storageDir, 'browser-state.json')
    let data: Record<string, unknown>
    try { data = JSON.parse(fs.readFileSync(file, 'utf8')) } catch { log.info('start with fresh browser state'); return null }
    // Unversioned files are the v0.5.0 shape (== version 1). Anything newer or
    // malformed is preserved as a backup rather than overwritten on next save.
    const version = typeof data?.version === 'number' ? data.version : 1
    const shape = data && Array.isArray(data.bookmarks) && Array.isArray(data.history) && Array.isArray(data.savedTabs) && Array.isArray(data.extensionRecords) && Array.isArray(data.permissions) && Array.isArray(data.shieldExceptions)
    if (version > STATE_VERSION || !shape) {
      const backup = `${file}.backup-v${version}-${Date.now()}`
      try { fs.renameSync(file, backup); log.warn('browser state not readable by this version; backed up', { version, backup }) } catch { log.error('could not back up unreadable browser state') }
      return null
    }
    return data as ReturnType<BrowserService['readState']>
  }

  private persist(): void {
    log.debug('persist browser preferences and public session')
    fs.mkdirSync(this.storageDir, { recursive: true })
    const target = path.join(this.storageDir, 'browser-state.json')
    const payload = { version: STATE_VERSION, spaces: this.state.spaces, preferences: this.state.preferences, bookmarks: this.state.bookmarks, history: this.state.history, permissions: this.state.permissions,
      shieldExceptions: this.state.shieldExceptions, extensionRecords: this.extensionRecords,
      savedTabs: this.state.preferences.restoreTabs ? persistableTabs([...this.views.values()].map(v => v.tab)) : [], }
    try { fs.writeFileSync(`${target}.tmp`, JSON.stringify(payload), { mode: 0o600 }); fs.renameSync(`${target}.tmp`, target) }
    catch { log.error('browser state save failed') }
  }

  private publish(save = false): void {
    if (this.disposed) return
    this.state.revision++
    this.state.pendingPermission = this.permissionQueue[0]?.request ?? null
    this.state.extensions = this.extensionRecords.map(({ id, name, version, enabled, pinned }): BrowserExtension => ({ id, name, version, enabled, pinned }))
    if (!this.sendScheduled) {
      // Coalesce: one IPC send per event-loop turn, however many events published.
      this.sendScheduled = true
      setImmediate(() => {
        this.sendScheduled = false
        if (!this.disposed && !this.window.isDestroyed()) this.window.webContents.send('browser:snapshot', this.snapshot())
      })
    }
    if (save && !this.restoring) {
      if (this.saveTimer) clearTimeout(this.saveTimer)
      this.saveTimer = setTimeout(() => { this.saveTimer = null; this.persist() }, 250)
    }
  }

  private getSession(isPrivate = false): Session {
    const ses = session.fromPartition(isPrivate ? this.privatePartition : 'persist:nsty-browsing')
    if (this.sessions.has(ses)) return ses
    log.info('configure isolated browsing session', { private: isPrivate })
    this.sessions.add(ses)
    ses.webRequest.onBeforeRequest((details, callback) => {
      const owner = [...this.views.values()].find(v => v.view.webContents.id === details.webContentsId)
      if (!owner || !this.blocker || !this.shieldActive(owner.tab.url) || details.resourceType === 'mainFrame') { callback({}); return }
      const result = this.blocker.match(fromElectronDetails({ ...details, referrer: owner.tab.url }))
      if (result.match || result.redirect) { owner.tab.blocked++; this.publish() }
      callback(result.redirect ? { redirectURL: result.redirect.dataUrl } : { cancel: result.match })
    })
    ses.setPermissionRequestHandler((contents, permission, callback, details) => {
      const owner = [...this.views.values()].find(v => v.view.webContents === contents)
      let origin: string
      try { origin = new URL(details.requestingUrl).origin } catch { callback(false); return }
      const eligible = ['media', 'geolocation', 'notifications', 'clipboard-read', 'fullscreen', 'pointerLock'].includes(permission)
      if (!owner || !eligible || !origin.startsWith('https://') || new URL(owner.tab.url).origin !== origin) { callback(false); return }
      const saved = !owner.tab.private && this.state.permissions.find(p => p.origin === origin && p.permission === permission)
      if (saved) { callback(saved.allowed); return }
      if (this.permissionQueue.length >= 5) { callback(false); return }
      const id = randomUUID()
      const timer = setTimeout(() => this.respondPermission(id, false, false), 60000)
      this.permissionQueue.push({ request: { id, origin, permission, tabId: owner.tab.id }, callback, timer })
      this.overlayOpen = true; this.layout(); this.publish()
    })
    ses.setPermissionCheckHandler((contents, permission, origin) => {
      const owner = [...this.views.values()].find(v => v.view.webContents === contents)
      return Boolean(owner && !owner.tab.private && this.state.permissions.find(p => p.origin === origin && p.permission === permission)?.allowed)
    })
    ses.on('will-download', (_event, item) => this.trackDownload(item))
    return ses
  }

  private createTab(input = 'nsty://newtab', isPrivate = false, space = this.state.activeSpace): BrowserTab {
    log.info('create native tab', { private: isPrivate })
    const url = normalizeAddress(input, this.state.preferences.searchEngine)
    const id = randomUUID()
    const view = new WebContentsView({ webPreferences: { session: this.getSession(isPrivate), contextIsolation: true, sandbox: true, nodeIntegration: false, webSecurity: true } })
    const tab: BrowserTab = { id, url, space, private: isPrivate, title: 'New tab', loading: false, canGoBack: false, canGoForward: false, muted: false, zoom: 1, error: null, blocked: 0 }
    const wc = view.webContents
    this.views.set(id, { tab, view })
    wc.setWindowOpenHandler(({ url: destination }) => {
      if (/^https?:\/\//i.test(destination)) { this.createTab(destination, isPrivate, space); this.publish(true) }
      return { action: 'deny' }
    })
    wc.on('will-navigate', (event, destination) => { if (!/^https?:\/\//i.test(destination)) event.preventDefault() })
    wc.on('did-start-loading', () => { tab.loading = true; tab.error = null; this.publish() })
    wc.on('did-stop-loading', () => { tab.loading = false; this.updateNavigation(tab, wc); this.publish() })
    const navigated = (_event: unknown, destination: string) => {
      tab.url = destination; tab.error = null; tab.blocked = 0; this.updateNavigation(tab, wc)
      if (!tab.private && /^https?:\/\//i.test(destination)) {
        this.state.history = [{ id: randomUUID(), url: destination, title: tab.title, visitedAt: Date.now() }, ...this.state.history.filter(h => h.url !== destination)].slice(0, HISTORY_LIMIT)
      }
      this.publish(!tab.private)
    }
    wc.on('did-navigate', navigated)
    wc.on('did-navigate-in-page', (event, destination, isMainFrame) => { if (isMainFrame) navigated(event, destination) })
    wc.on('page-title-updated', (_event, title) => { tab.title = title; if (!tab.private) for (const h of this.state.history) if (h.url === tab.url) h.title = title; this.publish(!tab.private) })
    wc.on('did-fail-load', (_event, code, description, _url, mainFrame) => {
      if (mainFrame && code !== -3) { tab.loading = false; tab.error = description; this.layout(); this.publish() }
    })
    wc.on('render-process-gone', () => { tab.error = 'This tab stopped responding. Reload to continue.'; tab.loading = false; this.layout(); this.publish() })
    wc.on('dom-ready', () => { void this.injectProtection(tab, wc) })
    wc.on('before-input-event', (event, input) => {
      if (input.type !== 'keyDown' || !(input.control || input.meta)) return
      const key = input.key.toLowerCase()
      if (['l', 't', 'w', 'f', 'h', 'j', 'd', 'p'].includes(key)) {
        event.preventDefault()
        if (key === 't') void this.dispatch({ type: input.shift ? 'tab:reopen' : 'tab:new' })
        else if (key === 'w') void this.dispatch({ type: 'tab:close', id })
        else this.window.webContents.send('browser:shortcut', key)
      }
    })
    this.state.activeTabId = id; this.state.activeSpace = space
    if (url !== 'nsty://newtab') this.load(tab, view, url)
    this.layout(); this.publish(true)
    return tab
  }

  private load(tab: BrowserTab, view: WebContentsView, url: string): void {
    log.info('navigate native tab')
    tab.url = url; tab.error = null
    if (url === 'nsty://newtab') { view.webContents.stop(); tab.loading = false; this.layout(); return }
    tab.loading = true
    void view.webContents.loadURL(url).catch(() => { if (!this.disposed && this.views.has(tab.id)) { tab.error ??= 'Unable to load this page. Check the address and connection.'; tab.loading = false; this.layout(); this.publish() } })
  }

  private updateNavigation(tab: BrowserTab, wc: WebContents): void {
    tab.canGoBack = wc.navigationHistory.canGoBack()
    tab.canGoForward = wc.navigationHistory.canGoForward()
  }

  private active(): ManagedTab | undefined { return this.views.get(this.state.activeTabId ?? '') }

  /** Native view of the active tab, for page-context extraction (AI). */
  getActiveView(): WebContentsView | null { return this.active()?.view ?? null }

  private closeTab(id: string): void {
    log.info('close native tab')
    const managed = this.views.get(id)
    if (!managed) return
    if (!managed.tab.private) this.closedTabs = [{ url: managed.tab.url, space: managed.tab.space }, ...this.closedTabs].slice(0, 20)
    for (const pending of [...this.permissionQueue]) if (pending.request.tabId === id) this.respondPermission(pending.request.id, false, false)
    this.window.contentView.removeChildView(managed.view); managed.view.webContents.close(); this.views.delete(id)
    if (this.state.activeTabId === id) this.state.activeTabId = [...this.views.values()].filter(v => v.tab.space === this.state.activeSpace).at(-1)?.tab.id ?? null
    if (managed.tab.private && ![...this.views.values()].some(v => v.tab.private)) {
      const privateSession = session.fromPartition(this.privatePartition)
      void privateSession.clearStorageData(); void privateSession.clearCache()
      this.sessions.delete(privateSession)
      this.privatePartition = `private-${randomUUID()}`
    }
    if (!this.active()) this.createTab()
    this.layout(); this.publish(true)
  }

  layout(): void {
    if (this.disposed || this.window.isDestroyed()) return
    log.debug('update native content bounds')
    const [width = 0, height = 0] = this.window.getContentSize()
    for (const { tab, view } of this.views.values()) {
      this.window.contentView.removeChildView(view)
      if (tab.id === this.state.activeTabId && tab.url !== 'nsty://newtab' && !tab.error && !this.overlayOpen && !this.permissionQueue.length) {
        this.window.contentView.addChildView(view)
        view.setBounds({ x: 240, y: 54, width: Math.max(100, width - 240), height: Math.max(100, height - 54) })
      }
    }
  }

  private applyTheme(): void {
    const light = this.state.preferences.theme === 'paper' || this.state.preferences.theme === 'system' && !nativeTheme.shouldUseDarkColors
    this.window.setBackgroundColor(light ? '#F1F0EA' : '#17191C')
    if (process.platform !== 'darwin') this.window.setTitleBarOverlay({ color: light ? '#FBFAF6' : '#292C30', symbolColor: light ? '#262A25' : '#F0F1EC', height: 54 })
  }

  private shieldActive(url: string): boolean {
    try { return this.state.preferences.shield && !this.state.shieldExceptions.includes(new URL(url).hostname) }
    catch { return false }
  }

  async initializeShield(): Promise<void> {
    log.info('load network protection filters')
    try {
      const cache = path.join(this.storageDir, 'shield-cache.bin')
      if (fs.existsSync(cache)) this.blocker = ElectronBlocker.deserialize(fs.readFileSync(cache))
      if (!this.blocker || Date.now() - fs.statSync(cache).mtimeMs > 86400000) {
        this.blocker = await ElectronBlocker.fromPrebuiltAdsAndTracking(fetch)
        if (!this.disposed) { fs.mkdirSync(this.storageDir, { recursive: true }); fs.writeFileSync(cache, this.blocker.serialize()) }
      }
      this.state.shieldReady = true; this.publish()
    } catch { this.state.shieldReady = Boolean(this.blocker); this.publish(); log.warn('filter update unavailable; cached filters used if present') }
  }

  private async injectProtection(tab: BrowserTab, wc: WebContents): Promise<void> {
    if (!this.shieldActive(tab.url)) return
    log.debug('apply page protection')
    try {
      const hostname = new URL(tab.url).hostname
      if (this.blocker) {
        const result = this.blocker.getCosmeticsFilters({ url: tab.url, hostname, domain: hostname, getBaseRules: true, getRulesFromHostname: true, getInjectionRules: true })
        if (result.active && result.styles) await wc.insertCSS(result.styles)
        if (result.active) for (const script of result.scripts) await wc.executeJavaScript(script).catch(() => undefined)
      }
      if (this.state.preferences.youtube && (hostname === 'youtube.com' || hostname.endsWith('.youtube.com'))) {
        youtubeScript ??= fs.readFileSync(path.join(app.getAppPath(), 'resources/content-scripts/youtube-shield.js'), 'utf8')
        await wc.executeJavaScript(youtubeScript)
      }
    } catch { log.warn('page protection injection unavailable') }
  }

  private trackDownload(item: DownloadItem): void {
    log.info('download started')
    const id = randomUUID(), record: BrowserSnapshot['downloads'][number] = { id, name: item.getFilename(), received: 0, total: item.getTotalBytes(), state: 'progressing' }
    this.downloadItems.set(id, item); this.state.downloads.unshift(record)
    if (!this.state.preferences.downloadAsk) item.setSavePath(path.join(app.getPath('downloads'), `${Date.now()}-${path.basename(item.getFilename())}`))
    item.on('updated', (_event, state) => { record.received = item.getReceivedBytes(); record.total = item.getTotalBytes(); record.state = item.isPaused() ? 'paused' : state; this.publish() })
    item.once('done', (_event, state) => { record.state = state; record.received = item.getReceivedBytes(); this.publish() })
    this.publish()
  }

  private respondPermission(id: string, allow: boolean, remember: boolean): void {
    log.info('resolve site permission', { allow, remember })
    const index = this.permissionQueue.findIndex(p => p.request.id === id)
    const pending = this.permissionQueue[index]
    if (!pending) return
    clearTimeout(pending.timer); this.permissionQueue.splice(index, 1)
    const tab = this.views.get(pending.request.tabId)?.tab
    if (remember && tab && !tab.private) {
      this.state.permissions = this.state.permissions.filter(p => p.origin !== pending.request.origin || p.permission !== pending.request.permission)
      this.state.permissions.push({ origin: pending.request.origin, permission: pending.request.permission, allowed: allow })
    }
    pending.callback(Boolean(tab) && allow)
    this.publish(remember)
  }

  private get extensionsDir(): string { return path.join(this.storageDir, 'extensions') }

  /** Only directories this app copied into userData/extensions are ever loaded. */
  private isManagedExtensionPath(candidate: string): boolean {
    const root = path.resolve(this.extensionsDir)
    const resolved = path.resolve(candidate)
    return resolved.startsWith(root + path.sep)
  }

  async loadExtensions(): Promise<void> {
    log.info('restore compatible unpacked extensions')
    const ses = this.getSession()
    for (const entry of this.extensionRecords) if (entry.enabled) {
      try { const ext = await ses.extensions.loadExtension(entry.path); entry.id = ext.id; entry.name = ext.name; entry.version = ext.version }
      catch { entry.enabled = false; log.warn('saved extension could not be loaded') }
    }
    this.publish(true)
  }

  /** Copy an unpacked extension into userData/extensions so restored paths are always app-owned. */
  async installExtension(source: string): Promise<void> {
    log.info('install unpacked extension into managed directory')
    if (!fs.existsSync(path.join(source, 'manifest.json'))) throw new Error('The folder does not contain an extension manifest')
    const target = path.join(this.extensionsDir, randomUUID())
    fs.mkdirSync(this.extensionsDir, { recursive: true })
    fs.cpSync(source, target, { recursive: true, dereference: true })
    const ext = await this.getSession().extensions.loadExtension(target)
    if (this.extensionRecords.some(e => e.id === ext.id)) { fs.rmSync(target, { recursive: true, force: true }); throw new Error('This extension is already installed') }
    this.extensionRecords.push({ id: ext.id, path: target, name: ext.name, version: ext.version, enabled: true, pinned: false })
  }

  private async extensionAction(action: Extract<BrowserAction, { type: 'extension:toggle' | 'extension:pin' | 'extension:remove' | 'extension:open' }>): Promise<void> {
    log.info('extension action', { type: action.type })
    const item = this.extensionRecords.find(e => e.id === action.id)
    if (!item) throw new Error('Extension no longer exists')
    const ses = this.getSession()
    if (action.type === 'extension:pin') item.pinned = !item.pinned
    else if (action.type === 'extension:remove') { if (item.enabled) ses.extensions.removeExtension(item.id); this.extensionRecords = this.extensionRecords.filter(e => e !== item); if (this.isManagedExtensionPath(item.path)) fs.rmSync(item.path, { recursive: true, force: true }) }
    else if (action.type === 'extension:toggle') {
      if (item.enabled) { ses.extensions.removeExtension(item.id); item.enabled = false }
      else { await ses.extensions.loadExtension(item.path); item.enabled = true }
    } else {
      if (!item.enabled) throw new Error('Enable the extension first')
      if (this.active()?.tab.private) throw new Error('Extensions are not available in private tabs')
      const manifest = JSON.parse(fs.readFileSync(path.join(item.path, 'manifest.json'), 'utf8'))
      const popup = manifest.action?.default_popup ?? manifest.browser_action?.default_popup ?? manifest.options_ui?.page ?? manifest.options_page
      if (typeof popup !== 'string' || !popup || /^[a-z]+:/i.test(popup)) throw new Error('This extension has no supported popup or options page')
      // Resolve and confirm containment inside the extension directory rather than
      // blacklisting '..' substrings (encoded/backslash variants would slip through).
      const root = path.resolve(item.path)
      const target = path.resolve(root, popup.replace(/^[\\/]+/, ''))
      if (target !== root && !target.startsWith(root + path.sep)) throw new Error('Extension page path is outside the extension')
      const page = path.relative(root, target).split(path.sep).join('/')
      const popupWindow = new BrowserWindow({ width: 420, height: 600, parent: this.window, autoHideMenuBar: true, webPreferences: { session: ses, sandbox: true, contextIsolation: true, nodeIntegration: false } })
      popupWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
      popupWindow.webContents.on('will-navigate', (event, destination) => { if (!destination.startsWith(`chrome-extension://${item.id}/`)) event.preventDefault() })
      await popupWindow.loadURL(`chrome-extension://${item.id}/${page}`)
    }
  }

  async dispatch(input: unknown): Promise<BrowserActionResult> {
    if (!validateBrowserAction(input)) return { ok: false, error: 'Invalid browser command' }
    const action = input, current = this.active(), wc = current?.view.webContents
    log.info('dispatch browser command', { type: action.type })
    try {
      switch (action.type) {
        case 'tab:new': this.createTab(action.url, action.private); break
        case 'tab:select': if (this.views.has(action.id)) { this.state.activeTabId = action.id; this.state.activeSpace = this.views.get(action.id)!.tab.space }; break
        case 'tab:close': this.closeTab(action.id); break
        case 'tab:duplicate': { const tab = this.views.get(action.id)?.tab; if (tab) this.createTab(tab.url, tab.private, tab.space); break }
        case 'tab:mute': { const managed = this.views.get(action.id); if (managed) { managed.tab.muted = !managed.tab.muted; managed.view.webContents.setAudioMuted(managed.tab.muted) }; break }
        case 'tab:reopen': { const tab = this.closedTabs.shift(); if (tab) this.createTab(tab.url, false, tab.space); break }
        case 'navigate': { const url = normalizeAddress(action.url, this.state.preferences.searchEngine); if (current) this.load(current.tab, current.view, url); else this.createTab(url); break }
        case 'space': if (!this.state.spaces.includes(action.name)) throw new Error('That space no longer exists'); this.state.activeSpace = action.name; this.state.activeTabId = [...this.views.values()].filter(v => v.tab.space === action.name).at(-1)?.tab.id ?? null; if (!this.active()) this.createTab(); break
        case 'space:create': { const name = action.name.trim(); if (this.state.spaces.includes(name)) throw new Error('A space with that name already exists'); if (this.state.spaces.length >= MAX_SPACES) throw new Error(`You can have up to ${MAX_SPACES} spaces`); this.state.spaces.push(name); this.state.activeSpace = name; this.state.activeTabId = null; this.createTab(); break }
        case 'space:remove': { if (!this.state.spaces.includes(action.name)) throw new Error('That space no longer exists'); if (this.state.spaces.length <= 1) throw new Error('Keep at least one space'); this.state.spaces = this.state.spaces.filter(name => name !== action.name); const home = this.state.spaces[0]!; for (const { tab } of this.views.values()) if (tab.space === action.name) tab.space = home; if (this.state.activeSpace === action.name) { this.state.activeSpace = home; this.state.activeTabId = [...this.views.values()].filter(v => v.tab.space === home).at(-1)?.tab.id ?? null; if (!this.active()) this.createTab() } break }
        case 'back': if (wc?.navigationHistory.canGoBack()) wc.navigationHistory.goBack(); break
        case 'forward': if (wc?.navigationHistory.canGoForward()) wc.navigationHistory.goForward(); break
        case 'reload': if (current) this.load(current.tab, current.view, current.tab.url); break
        case 'stop': wc?.stop(); break
        case 'overlay': this.overlayOpen = action.open; break
        case 'preferences': this.state.preferences = { ...this.state.preferences, ...action.patch }; this.applyTheme(); if (action.patch.shield !== undefined || action.patch.youtube !== undefined) for (const { tab, view } of this.views.values()) if (tab.url !== 'nsty://newtab') view.webContents.reload(); break
        case 'zoom': if (current) { current.tab.zoom = action.value; wc?.setZoomFactor(action.value) }; break
        case 'find': if (action.text) wc?.findInPage(action.text, { forward: action.forward ?? true }); else wc?.stopFindInPage('clearSelection'); break
        case 'print': if (wc && current?.tab.url !== 'nsty://newtab') wc.print({}, (success, reason) => { if (!success) log.warn('printing did not complete', { reason }) }); break
        case 'save-page': { if (!wc || current?.tab.url === 'nsty://newtab') break; const result = await dialog.showSaveDialog(this.window, { defaultPath: 'page.html', filters: [{ name: 'Web page', extensions: ['html'] }] }); if (result.filePath) await wc.savePage(result.filePath, 'HTMLComplete'); break }
        case 'devtools': wc?.openDevTools({ mode: 'detach' }); break
        case 'bookmark:add': { const url = normalizeAddress(action.url); if (!/^https?:/.test(url)) throw new Error('Only web pages can be bookmarked'); this.state.bookmarks.push({ id: randomUUID(), url, title: action.title || url, folder: action.folder || 'Favorites' }); break }
        case 'bookmark:remove': this.state.bookmarks = this.state.bookmarks.filter(b => b.id !== action.id); break
        case 'bookmarks:import': { const result = await dialog.showOpenDialog(this.window, { properties: ['openFile'], filters: [{ name: 'Nsty bookmarks JSON', extensions: ['json'] }] }); const file = result.filePaths[0]; if (file) { const data: unknown = JSON.parse(fs.readFileSync(file, 'utf8')); if (!Array.isArray(data) || data.length > 5000) throw new Error('Invalid bookmarks file'); for (const entry of data) { if (!validateBrowserAction({ ...entry, type: 'bookmark:add' })) throw new Error('Invalid bookmark entry'); const url = normalizeAddress(entry.url); if (!/^https?:/.test(url)) continue; this.state.bookmarks.push({ id: randomUUID(), url, title: entry.title, folder: entry.folder }) } }; break }
        case 'bookmarks:export': { const result = await dialog.showSaveDialog(this.window, { defaultPath: 'nsty-bookmarks.json' }); if (result.filePath) fs.writeFileSync(result.filePath, JSON.stringify(this.state.bookmarks, null, 2)); break }
        case 'clear-data': if (action.history) this.state.history = []; for (const ses of new Set([...this.sessions, session.fromPartition('persist:nsty-browsing'), session.fromPartition(this.privatePartition)])) { if (action.cookies) await ses.clearStorageData(); if (action.cache) await ses.clearCache() }; break
        case 'download:pause': this.downloadItems.get(action.id)?.pause(); break
        case 'download:resume': this.downloadItems.get(action.id)?.resume(); break
        case 'download:cancel': this.downloadItems.get(action.id)?.cancel(); break
        case 'download:open': case 'download:folder': { const item = this.downloadItems.get(action.id); if (item?.getState() !== 'completed') throw new Error('Download is not complete'); if (action.type === 'download:open') { const error = await shell.openPath(item.getSavePath()); if (error) throw new Error(error) } else shell.showItemInFolder(item.getSavePath()); break }
        case 'extensions:load': { const result = await dialog.showOpenDialog(this.window, { properties: ['openDirectory'], title: 'Load a compatible unpacked extension' }); const directory = result.filePaths[0]; if (directory) await this.installExtension(directory); break }
        case 'extension:toggle': case 'extension:remove': case 'extension:pin': case 'extension:open': await this.extensionAction(action); break
        case 'shield:site': this.state.shieldExceptions = this.state.shieldExceptions.filter(h => h !== action.host); if (!action.enabled) this.state.shieldExceptions.push(action.host); for (const { tab, view } of this.views.values()) if (tab.url !== 'nsty://newtab' && new URL(tab.url).hostname === action.host) view.webContents.reload(); break
        case 'permission:respond': this.respondPermission(action.id, action.allow, action.remember); break
        case 'permission:remove': this.state.permissions = this.state.permissions.filter(p => p.origin !== action.origin || p.permission !== action.permission); break
      }
      this.layout(); this.publish(action.type !== 'overlay' && action.type !== 'find')
      return { ok: true, snapshot: this.snapshot() }
    } catch (error) { log.warn('browser command failed', { type: action.type }); return { ok: false, error: error instanceof Error ? error.message : 'The operation could not be completed' } }
  }

  registerIpc(): void {
    log.info('register browser IPC with exact shell identity')
    const trusted = (event: Electron.IpcMainInvokeEvent) => event.sender === this.window.webContents && event.senderFrame === this.window.webContents.mainFrame && isShellUrl(event.senderFrame?.url ?? '', !app.isPackaged)
    ipcMain.handle('browser:getSnapshot', event => { if (!trusted(event)) throw new Error('Untrusted browser caller'); return this.snapshot() })
    ipcMain.handle('browser:action', (event, action: unknown) => { if (!trusted(event)) throw new Error('Untrusted browser caller'); return this.dispatch(action) })
    ipcMain.handle('browser:history', (event, query: unknown, limit: unknown) => { if (!trusted(event)) throw new Error('Untrusted browser caller'); return this.searchHistory(typeof query === 'string' ? query : '', typeof limit === 'number' ? limit : 50) })
  }

  dispose(): void {
    if (this.disposed) return
    log.info('dispose browser service')
    if (this.saveTimer) clearTimeout(this.saveTimer)
    this.persist(); this.disposed = true
    for (const pending of this.permissionQueue) { clearTimeout(pending.timer); pending.callback(false) }
    this.permissionQueue.length = 0
    for (const { view } of this.views.values()) if (!view.webContents.isDestroyed()) view.webContents.close()
    this.views.clear()
    ipcMain.removeHandler('browser:getSnapshot'); ipcMain.removeHandler('browser:action'); ipcMain.removeHandler('browser:history')
  }
}
