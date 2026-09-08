import { app, BrowserWindow, WebContentsView, clipboard, dialog, ipcMain, nativeTheme, session, shell } from 'electron'
import type { DownloadItem, Session, WebContents } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { ElectronBlocker, fromElectronDetails } from '@ghostery/adblocker-electron'
import fetch from 'cross-fetch'
import { DEFAULT_BROWSER_PREFERENCES } from '../shared/browser'
import type { BrowserAction, BrowserActionResult, BrowserHistoryEntry, BrowserSnapshot, BrowserTab, BrowserPermission, BrowserExtension, BrowserOverlay, OverlayAnchor, OverlaySurface } from '../shared/browser'
import { MAX_SPACES, buildSuggestions, isBrowserShortcut, isExternalProtocol, isShellUrl, isSpaceName, normalizeAddress, persistableTabs, validateBrowserAction } from '../shared/browser-policy'
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
/** An unanswered HTTP basic-auth challenge. Credentials are never stored here. */
interface PendingAuth { id: string; callback: (username?: string, password?: string) => void; tabId: string; host: string; realm: string; isProxy: boolean }
/** Web addresses are the only thing the context menu will copy, save or open. */
const isWebUrl = (value: string | undefined): value is string => typeof value === 'string' && /^https?:\/\//i.test(value)
const MAX_AUTH_PROMPTS = 5
export interface BrowserServiceOptions {
  /** Shell document the overlay view loads (with the '#overlay' hash appended). */
  shellUrl?: string
  preloadPath?: string
  /** Applied to every view main creates, so index.ts can attach its navigation guard. */
  onViewCreated?: (webContents: WebContents) => void
}
/** Actions that change only transient chrome state and must not schedule a save. */
/** Popovers that describe the active page and must close when it goes away. */
const TAB_SCOPED_SURFACES = new Set<OverlaySurface>(['find', 'context', 'site', 'shield', 'suggestions'])
const TRANSIENT_ACTIONS = new Set(['find', 'overlay:open', 'overlay:close', 'suggest', 'suggest:highlight'])

export class BrowserService {
  private readonly views = new Map<string, ManagedTab>()
  private readonly sessions = new Set<Session>()
  private readonly downloadItems = new Map<string, DownloadItem>()
  private readonly permissionQueue: PendingPermission[] = []
  private readonly authQueue: PendingAuth[] = []
  /** Tab currently in HTML5 fullscreen; its view covers the whole window. */
  private fullscreenTabId: string | null = null
  private extensionRecords: ExtensionRecord[] = []
  private closedTabs: { url: string; space: string }[] = []
  private overlayView: WebContentsView | null = null
  /** Content-area origin reported by the renderer (sidebar width, toolbar height). */
  private contentOrigin = { x: 240, y: 54 }
  private blocker: ElectronBlocker | null = null
  private saveTimer: ReturnType<typeof setTimeout> | null = null
  private sendScheduled = false
  private disposed = false
  /** Set when an unreadable state file could not be backed up: never overwrite it. */
  private persistBlocked = false
  private restoring = true
  private privatePartition = `private-${randomUUID()}`
  private state: BrowserSnapshot = {
    revision: 0, tabs: [], activeTabId: null, activeSpace: 'Work', spaces: [...DEFAULT_SPACES], preferences: { ...DEFAULT_BROWSER_PREFERENCES },
    bookmarks: [], history: [], downloads: [], extensions: [], pendingPermission: null, permissions: [],
    shieldExceptions: [], shieldReady: false, capabilities: { extensions: true, privateBrowsing: true }, overlay: null,
  }

  constructor(private readonly window: BrowserWindow, private readonly storageDir = app.getPath('userData'), private readonly options: BrowserServiceOptions = {}) {
    log.info('initialize main-owned browser state')
    const restored = this.readState()
    if (restored && validateBrowserAction({ type: 'preferences', patch: restored.preferences })) this.state.preferences = { ...DEFAULT_BROWSER_PREFERENCES, ...restored.preferences }
    this.state.bookmarks = (restored?.bookmarks ?? []).filter(b => typeof b.id === 'string' && typeof b.title === 'string' && typeof b.folder === 'string' && /^https?:\/\//.test(b.url))
    this.state.history = (restored?.history ?? []).filter(h => typeof h.id === 'string' && typeof h.title === 'string' && typeof h.visitedAt === 'number' && /^https?:\/\//.test(h.url)).slice(0, HISTORY_LIMIT)
    this.state.shieldExceptions = (restored?.shieldExceptions ?? []).filter(h => typeof h === 'string' && /^[a-z\d.-]+$/i.test(h))
    this.state.permissions = (restored?.permissions ?? []).filter(p => typeof p.origin === 'string' && typeof p.permission === 'string' && typeof p.allowed === 'boolean')
    this.extensionRecords = []
    for (const record of (restored?.extensionRecords ?? []).filter(e => typeof e.id === 'string' && typeof e.path === 'string')) {
      if (this.isManagedExtensionPath(record.path)) { this.extensionRecords.push(record); continue }
      // Legacy record from before extensions were copied into userData: migrate the
      // directory once if it still exists, otherwise drop it visibly.
      try {
        if (!fs.existsSync(path.join(record.path, 'manifest.json'))) throw new Error('missing manifest')
        const target = path.join(this.extensionsDir, randomUUID())
        fs.mkdirSync(this.extensionsDir, { recursive: true })
        fs.cpSync(record.path, target, { recursive: true, dereference: true })
        this.extensionRecords.push({ ...record, path: target })
        log.info('migrated legacy extension into managed directory', { id: record.id })
      } catch { log.warn('dropped legacy extension record that could not be migrated', { id: record.id }) }
    }
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
    // Mouse back/forward buttons arrive as window app commands on Windows and Linux.
    this.window.on('app-command', (_event, command) => {
      log.debug('window app command', { command })
      if (command === 'browser-backward') void this.dispatch({ type: 'back' })
      else if (command === 'browser-forward') void this.dispatch({ type: 'forward' })
    })
    // The user left fullscreen at window level (F11 or Esc): tell the page too.
    this.window.on('leave-full-screen', () => {
      const managed = this.fullscreenTabId ? this.views.get(this.fullscreenTabId) : undefined
      if (!managed) return
      log.info('exit page fullscreen with the window')
      void managed.view.webContents.executeJavaScript('document.exitFullscreen()').catch(() => undefined)
    })
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
      try { fs.renameSync(file, backup); log.warn('browser state not readable by this version; backed up', { version, backup }) }
      catch { this.persistBlocked = true; log.error('could not back up unreadable browser state; persistence disabled for this session to protect it') }
      return null
    }
    return data as ReturnType<BrowserService['readState']>
  }

  private persist(): void {
    if (this.persistBlocked) { log.warn('skip persist: original state file is preserved untouched'); return }
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
        if (this.disposed) return
        const snapshot = this.snapshot()
        if (!this.window.isDestroyed()) this.window.webContents.send('browser:snapshot', snapshot)
        const overlay = this.overlayView?.webContents
        if (overlay && !overlay.isDestroyed()) overlay.send('browser:snapshot', snapshot)
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
      this.showOverlay('permission', null, {}); this.publish()
    })
    ses.setPermissionCheckHandler((contents, permission, origin) => {
      const owner = [...this.views.values()].find(v => v.view.webContents === contents)
      return Boolean(owner && !owner.tab.private && this.state.permissions.find(p => p.origin === origin && p.permission === permission)?.allowed)
    })
    ses.on('will-download', (_event, item) => this.trackDownload(item))
    return ses
  }

  private createTab(input = 'nsty://newtab', isPrivate = false, space = this.state.activeSpace, options: { activate?: boolean } = {}): BrowserTab {
    const activate = options.activate !== false
    log.info('create native tab', { private: isPrivate, activate })
    const url = normalizeAddress(input, this.state.preferences.searchEngine)
    const id = randomUUID()
    const view = new WebContentsView({ webPreferences: { session: this.getSession(isPrivate), contextIsolation: true, sandbox: true, nodeIntegration: false, webSecurity: true } })
    const tab: BrowserTab = { id, url, space, private: isPrivate, title: 'New tab', loading: false, canGoBack: false, canGoForward: false, muted: false, zoom: 1, error: null, blocked: 0, favicon: null, audible: false, find: null }
    const wc = view.webContents
    this.views.set(id, { tab, view })
    wc.setWindowOpenHandler(({ url: destination, disposition }) => {
      log.info('page requested a new window', { disposition })
      if (isExternalProtocol(destination)) void shell.openExternal(destination)
      else if (isWebUrl(destination)) { this.createTab(destination, isPrivate, space, { activate: disposition !== 'background-tab' }); this.publish(true) }
      return { action: 'deny' }
    })
    wc.on('will-navigate', (event, destination) => {
      if (isWebUrl(destination)) return
      event.preventDefault()
      // mailto:/tel:/sms: belong to the operating system; every other non-web scheme stays blocked.
      if (isExternalProtocol(destination)) { log.info('open a link in the system handler'); void shell.openExternal(destination) }
    })
    wc.on('context-menu', (_event, params) => {
      log.info('open page context menu', { mediaType: params.mediaType, editable: params.isEditable, link: Boolean(params.linkURL) })
      this.showOverlay('context', { x: this.contentOrigin.x + params.x, y: this.contentOrigin.y + params.y, width: 0, height: 0 }, {
        x: params.x, y: params.y, linkURL: params.linkURL, srcURL: params.srcURL, mediaType: params.mediaType,
        selectionText: params.selectionText.slice(0, 200), isEditable: params.isEditable,
        canGoBack: tab.canGoBack, canGoForward: tab.canGoForward,
        canCopy: params.editFlags.canCopy, canPaste: params.editFlags.canPaste, canCut: params.editFlags.canCut, canSelectAll: params.editFlags.canSelectAll,
      })
      this.publish()
    })
    wc.on('enter-html-full-screen', () => {
      log.info('page entered fullscreen')
      this.fullscreenTabId = tab.id
      this.window.setFullScreen(true)
      if (this.state.overlay) this.hideOverlay(true)
      this.layout(); this.publish()
    })
    wc.on('leave-html-full-screen', () => {
      log.info('page left fullscreen')
      this.fullscreenTabId = null
      this.window.setFullScreen(false)
      this.layout(); this.publish()
    })
    wc.on('login', (event, _details, authInfo, callback) => {
      event.preventDefault()
      log.info('site asked for credentials', { host: authInfo.host, proxy: authInfo.isProxy })
      if (this.authQueue.length >= MAX_AUTH_PROMPTS) { log.warn('too many pending authentication prompts; cancelling this one'); callback(); return }
      const id = randomUUID()
      this.authQueue.push({ id, callback, tabId: tab.id, host: authInfo.host, realm: authInfo.realm ?? '', isProxy: authInfo.isProxy })
      if (this.authQueue.length === 1) this.showAuthPrompt()
      this.publish()
    })
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
    wc.on('page-favicon-updated', (_event, favicons) => { const icon = favicons.find(u => /^(https?:|data:image\/)/i.test(u)) ?? null; if (icon !== tab.favicon) { tab.favicon = icon; this.publish() } })
    wc.on('audio-state-changed', event => { tab.audible = event.audible; this.publish() })
    wc.on('found-in-page', (_event, result) => { tab.find = { active: result.activeMatchOrdinal, total: result.matches }; this.publish() })
    wc.on('page-title-updated', (_event, title) => { tab.title = title; if (!tab.private) for (const h of this.state.history) if (h.url === tab.url) h.title = title; this.publish(!tab.private) })
    wc.on('did-fail-load', (_event, code, description, _url, mainFrame) => {
      if (!mainFrame || code === -3) return
      tab.loading = false
      tab.error = /^ERR_(CERT|SSL)/.test(description)
        ? `The connection is not secure: this site’s certificate could not be verified (${description}).`
        : description
      this.layout(); this.publish()
    })
    wc.on('render-process-gone', () => { tab.error = 'This tab stopped responding. Reload to continue.'; tab.loading = false; this.layout(); this.publish() })
    wc.on('dom-ready', () => { void this.injectProtection(tab, wc) })
    wc.on('before-input-event', (event, input) => {
      if (input.type === 'keyDown' && this.handleShortcut({ key: input.key, ctrl: input.control, shift: input.shift, alt: input.alt, meta: input.meta })) event.preventDefault()
    })
    if (activate) { this.state.activeTabId = id; this.state.activeSpace = space }
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
    const wasActive = this.state.activeTabId === id
    if (!managed.tab.private) this.closedTabs = [{ url: managed.tab.url, space: managed.tab.space }, ...this.closedTabs].slice(0, 20)
    for (const pending of [...this.permissionQueue]) if (pending.request.tabId === id) this.respondPermission(pending.request.id, false, false)
    for (const pending of [...this.authQueue]) if (pending.tabId === id) this.resolveAuth(pending.id)
    if (this.fullscreenTabId === id) { this.fullscreenTabId = null; this.window.setFullScreen(false) }
    this.window.contentView.removeChildView(managed.view); managed.view.webContents.close(); this.views.delete(id)
    if (this.state.activeTabId === id) this.state.activeTabId = [...this.views.values()].filter(v => v.tab.space === this.state.activeSpace).at(-1)?.tab.id ?? null
    if (managed.tab.private && ![...this.views.values()].some(v => v.tab.private)) {
      const privateSession = session.fromPartition(this.privatePartition)
      void privateSession.clearStorageData(); void privateSession.clearCache()
      this.sessions.delete(privateSession)
      this.privatePartition = `private-${randomUUID()}`
    }
    if (!this.active()) this.createTab()
    // Surfaces that describe one page die with it: the tab they belong to, or
    // the active tab for the popovers that have no tabId of their own.
    if (this.state.overlay && (this.state.overlay.payload.tabId === id || wasActive && TAB_SCOPED_SURFACES.has(this.state.overlay.surface))) this.state.overlay = null
    this.layout(); this.publish(true)
  }

  /**
   * The single transparent view that hosts every chrome surface. Created on
   * first use and then kept alive: reloading it on every open would flash.
   */
  private ensureOverlayView(): WebContentsView | null {
    if (this.overlayView || this.disposed) return this.overlayView
    log.info('create transparent overlay view')
    const preload = this.options.preloadPath ?? path.join(__dirname, '../preload/index.js')
    const view = new WebContentsView({ webPreferences: { preload, contextIsolation: true, nodeIntegration: false, sandbox: true, transparent: true } })
    view.setBackgroundColor('#00000000')
    this.overlayView = view
    this.options.onViewCreated?.(view.webContents)
    void view.webContents.loadURL(`${this.options.shellUrl ?? 'app://bundle/index.html'}#overlay`).catch(() => log.error('overlay shell failed to load'))
    return view
  }

  /** Show a chrome surface above the live page; the page view is never detached. */
  private showOverlay(surface: OverlaySurface, anchor: OverlayAnchor | null, payload: BrowserOverlay['payload'], focus = true): void {
    log.info('open overlay surface', { surface, anchored: Boolean(anchor) })
    this.state.overlay = { surface, anchor, payload, origin: { ...this.contentOrigin } }
    const view = this.ensureOverlayView()
    this.layout()
    // Suggestions keep the caret in the shell address bar; every other surface
    // owns the keyboard while it is open.
    if (focus && view && !view.webContents.isDestroyed()) view.webContents.focus()
  }

  /** Close the surface and hand the keyboard back to the page, unless a permission is pending. */
  private hideOverlay(force = false): void {
    const surface = this.state.overlay?.surface
    if (!force && (surface === 'permission' && this.permissionQueue.length || surface === 'auth' && this.authQueue.length)) { log.debug('modal surface stays until it is answered', { surface }); return }
    log.info('close overlay surface')
    this.state.overlay = null
    this.layout()
    const wc = this.active()?.view.webContents
    if (wc && !wc.isDestroyed()) wc.focus()
  }

  /** Show the first queued credential prompt; the payload never carries credentials. */
  private showAuthPrompt(): void {
    const pending = this.authQueue[0]
    if (!pending) { this.hideOverlay(true); return }
    log.info('prompt for site credentials', { host: pending.host, proxy: pending.isProxy })
    this.showOverlay('auth', null, { id: pending.id, host: pending.host, realm: pending.realm, isProxy: pending.isProxy })
  }

  /** Answer or cancel a queued challenge. Credentials go straight to Chromium, never to a log. */
  private resolveAuth(id: string, username?: string, password?: string): void {
    const index = this.authQueue.findIndex(entry => entry.id === id)
    const pending = this.authQueue[index]
    if (!pending) return
    log.info('resolve credential prompt', { host: pending.host, cancelled: username === undefined })
    this.authQueue.splice(index, 1)
    if (username === undefined) pending.callback()
    else pending.callback(username, password ?? '')
    if (this.state.overlay?.surface === 'auth') this.showAuthPrompt()
  }

  /** Tabs of the active space, in creation order: the order the sidebar shows. */
  private spaceTabs(): ManagedTab[] {
    return [...this.views.values()].filter(managed => managed.tab.space === this.state.activeSpace)
  }

  /**
   * The single implementation of every key combination the browser owns, used
   * by focused page views (before-input-event) and by the shell alike.
   * Returns true when the key was handled and must not reach the page.
   */
  private handleShortcut(input: { key: string; ctrl: boolean; shift: boolean; alt: boolean; meta: boolean }): boolean {
    const { key, shift, alt } = input
    const mod = input.ctrl || input.meta
    if (!isBrowserShortcut(key, { ctrl: input.ctrl, shift, alt, meta: input.meta })) return false
    log.info('handle browser shortcut', { key, mod, shift, alt })
    const name = key.length === 1 ? key.toLowerCase() : key
    const current = this.active(), wc = current?.view.webContents
    const zoom = (value: number) => { void this.dispatch({ type: 'zoom', value: Math.min(2, Math.max(0.5, Math.round(value * 100) / 100)) }) }
    if (alt) { void this.dispatch({ type: name === 'ArrowLeft' ? 'back' : 'forward' }); return true }
    if (name === 'F11') { this.window.setFullScreen(!this.window.isFullScreen()); return true }
    if (name === 'F12' || mod && shift && name === 'i') { void this.dispatch({ type: 'devtools' }); return true }
    if (name === 'F5' || mod && name === 'r') {
      if (shift) wc?.reloadIgnoringCache(); else void this.dispatch({ type: 'reload' })
      return true
    }
    if (name === 'Escape') { if (!current?.tab.loading) return false; wc?.stop(); return true }
    if (mod && shift) {
      if (name === 't') void this.dispatch({ type: 'tab:reopen' })
      else if (name === 'n') void this.dispatch({ type: 'tab:new', private: true })
      else void this.dispatch({ type: 'tab:cycle', delta: -1 })
      return true
    }
    if (name === 'PageUp') { void this.dispatch({ type: 'tab:cycle', delta: -1 }); return true }
    if (name === 'Tab' || name === 'PageDown') { void this.dispatch({ type: 'tab:cycle', delta: 1 }); return true }
    if (name === 't') { void this.dispatch({ type: 'tab:new' }); return true }
    if (name === 'w') { if (current) void this.dispatch({ type: 'tab:close', id: current.tab.id }); return true }
    if (name === 'p') { void this.dispatch({ type: 'print' }); return true }
    if (name === '=' || name === '+') { zoom((current?.tab.zoom ?? 1) + 0.1); return true }
    if (name === '-') { zoom((current?.tab.zoom ?? 1) - 0.1); return true }
    if (name === '0') { zoom(1); return true }
    if (name >= '1' && name <= '9') {
      const tabs = this.spaceTabs()
      void this.dispatch({ type: 'tab:nth', index: name === '9' ? Math.max(0, tabs.length - 1) : Number(name) - 1 })
      return true
    }
    if (name === 'l') { this.window.webContents.send('browser:shortcut', 'l'); return true }
    const surface: Record<string, OverlaySurface> = { f: 'find', h: 'history', j: 'downloads', d: 'bookmark' }
    if (surface[name]) { this.showOverlay(surface[name]!, null, {}); this.publish() }
    return true
  }

  layout(): void {
    if (this.disposed || this.window.isDestroyed()) return
    log.debug('update native content bounds')
    const [width = 0, height = 0] = this.window.getContentSize()
    const { x, y } = this.contentOrigin
    const rect = { x, y, width: Math.max(100, width - x), height: Math.max(100, height - y) }
    for (const { tab, view } of this.views.values()) {
      this.window.contentView.removeChildView(view)
      if (tab.id === this.state.activeTabId && tab.url !== 'nsty://newtab' && !tab.error) {
        this.window.contentView.addChildView(view)
        // A page in HTML5 fullscreen owns the whole window: no toolbar, no sidebar.
        view.setBounds(tab.id === this.fullscreenTabId ? { x: 0, y: 0, width, height } : rect)
      }
    }
    // Re-adding puts the overlay last in the child list, i.e. above the page.
    if (this.overlayView) {
      this.window.contentView.removeChildView(this.overlayView)
      if (this.state.overlay) { this.window.contentView.addChildView(this.overlayView); this.overlayView.setBounds(rect) }
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
    if (!this.permissionQueue.length && this.state.overlay?.surface === 'permission') this.hideOverlay(true)
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
        case 'tab:new': this.createTab(action.url, action.private, this.state.activeSpace, { activate: !action.background }); break
        case 'tab:cycle': { const tabs = this.spaceTabs(); if (tabs.length < 2) break; const index = tabs.findIndex(managed => managed.tab.id === this.state.activeTabId); const next = tabs[(Math.max(0, index) + action.delta + tabs.length) % tabs.length]; if (next) this.state.activeTabId = next.tab.id; break }
        case 'tab:nth': { const target = this.spaceTabs()[Math.floor(action.index)]; if (target) this.state.activeTabId = target.tab.id; break }
        case 'tab:select': if (this.views.has(action.id)) { this.state.activeTabId = action.id; this.state.activeSpace = this.views.get(action.id)!.tab.space }; break
        case 'tab:close': this.closeTab(action.id); break
        case 'tab:duplicate': { const tab = this.views.get(action.id)?.tab; if (tab) this.createTab(tab.url, tab.private, tab.space); break }
        case 'tab:mute': { const managed = this.views.get(action.id); if (managed) { managed.tab.muted = !managed.tab.muted; managed.view.webContents.setAudioMuted(managed.tab.muted) }; break }
        case 'tab:reopen': { const tab = this.closedTabs.shift(); if (tab) this.createTab(tab.url, false, this.state.spaces.includes(tab.space) ? tab.space : this.state.spaces[0]!); break }
        case 'navigate': { const url = normalizeAddress(action.url, this.state.preferences.searchEngine); if (current) this.load(current.tab, current.view, url); else this.createTab(url); break }
        case 'space': if (!this.state.spaces.includes(action.name.trim())) throw new Error('That space no longer exists'); this.state.activeSpace = action.name.trim(); this.state.activeTabId = [...this.views.values()].filter(v => v.tab.space === this.state.activeSpace).at(-1)?.tab.id ?? null; if (!this.active()) this.createTab(); break
        case 'space:create': { const name = action.name.trim(); if (this.state.spaces.includes(name)) throw new Error('A space with that name already exists'); if (this.state.spaces.length >= MAX_SPACES) throw new Error(`You can have up to ${MAX_SPACES} spaces`); this.state.spaces.push(name); this.state.activeSpace = name; this.state.activeTabId = null; this.createTab(); break }
        case 'space:remove': { if (!this.state.spaces.includes(action.name)) throw new Error('That space no longer exists'); if (this.state.spaces.length <= 1) throw new Error('Keep at least one space'); this.state.spaces = this.state.spaces.filter(name => name !== action.name); const home = this.state.spaces[0]!; for (const { tab } of this.views.values()) if (tab.space === action.name) tab.space = home; if (this.state.activeSpace === action.name) { this.state.activeSpace = home; this.state.activeTabId = [...this.views.values()].filter(v => v.tab.space === home).at(-1)?.tab.id ?? null; if (!this.active()) this.createTab() } break }
        case 'back': if (wc?.navigationHistory.canGoBack()) wc.navigationHistory.goBack(); break
        case 'forward': if (wc?.navigationHistory.canGoForward()) wc.navigationHistory.goForward(); break
        case 'reload': if (current) this.load(current.tab, current.view, current.tab.url); break
        case 'stop': wc?.stop(); break
        case 'overlay:open': this.showOverlay(action.surface, action.anchor ?? null, action.payload ?? {}); break
        case 'overlay:close': this.hideOverlay(); break
        case 'suggest': {
          const rows = buildSuggestions(action.query, this.state.preferences.searchEngine, this.state.bookmarks, this.searchHistory(action.query, 6))
          this.showOverlay('suggestions', action.anchor, { query: action.query, rows, highlight: 0 }, false)
          break
        }
        case 'suggest:highlight': {
          const overlay = this.state.overlay
          if (overlay?.surface !== 'suggestions') break
          const rows = overlay.payload.rows ?? []
          overlay.payload.highlight = Math.min(Math.max(0, Math.floor(action.index)), Math.max(0, rows.length - 1))
          break
        }
        case 'suggest:accept': {
          const overlay = this.state.overlay
          if (overlay?.surface !== 'suggestions') break
          const row = (overlay.payload.rows ?? [])[overlay.payload.highlight ?? 0]
          if (!row?.url) break
          const url = normalizeAddress(row.url, this.state.preferences.searchEngine)
          if (current) this.load(current.tab, current.view, url); else this.createTab(url)
          this.hideOverlay(true)
          break
        }
        // The overlay positions popovers against this origin: keep an open surface in step.
        case 'layout': this.contentOrigin = { x: Math.round(action.x), y: Math.round(action.y) }; if (this.state.overlay) this.state.overlay.origin = { ...this.contentOrigin }; break
        case 'preferences': this.state.preferences = { ...this.state.preferences, ...action.patch }; this.applyTheme(); if (action.patch.shield !== undefined || action.patch.youtube !== undefined) for (const { tab, view } of this.views.values()) if (tab.url !== 'nsty://newtab') view.webContents.reload(); break
        case 'zoom': if (current) { current.tab.zoom = action.value; wc?.setZoomFactor(action.value) }; break
        case 'find': if (action.text) wc?.findInPage(action.text, { forward: action.forward ?? true }); else { wc?.stopFindInPage('clearSelection'); if (current) current.tab.find = null }; break
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
        case 'auth:respond': this.resolveAuth(action.id, action.username, action.password); break
        case 'shortcut': this.handleShortcut({ key: action.key, ctrl: action.ctrl, shift: action.shift, alt: action.alt, meta: action.meta }); break
        case 'context': {
          if (!wc || !current) break
          const url = action.url
          if (action.command === 'inspect') {
            if (!wc.isDevToolsOpened()) wc.openDevTools({ mode: 'detach' })
            wc.inspectElement(Math.round(action.x ?? 0), Math.round(action.y ?? 0))
          }
          else if (action.command === 'copy') wc.copy()
          else if (action.command === 'cut') wc.cut()
          else if (action.command === 'paste') wc.paste()
          else if (action.command === 'select-all') wc.selectAll()
          // Only real web addresses are copied, downloaded or opened: a page can
          // put javascript:/data:/file: into a link or an image source.
          else if (!isWebUrl(url)) log.warn('context menu command ignored for a non-web address', { command: action.command })
          else if (action.command === 'copy-link' || action.command === 'copy-image') clipboard.writeText(url)
          else if (action.command === 'save-image') wc.downloadURL(url)
          else if (action.command === 'open-link') this.createTab(url, current.tab.private, current.tab.space, { activate: false })
          else if (action.command === 'open-link-private') this.createTab(url, true, current.tab.space, { activate: true })
          this.hideOverlay(true)
          break
        }
      }
      this.layout(); this.publish(!TRANSIENT_ACTIONS.has(action.type))
      return { ok: true, snapshot: this.snapshot() }
    } catch (error) { log.warn('browser command failed', { type: action.type }); return { ok: false, error: error instanceof Error ? error.message : 'The operation could not be completed' } }
  }

  registerIpc(): void {
    log.info('register browser IPC with exact shell identity')
    const trusted = (event: Electron.IpcMainInvokeEvent) => {
      const fromShell = event.sender === this.window.webContents && event.senderFrame === this.window.webContents.mainFrame
      const fromOverlay = Boolean(this.overlayView) && event.sender === this.overlayView?.webContents
      return (fromShell || fromOverlay) && isShellUrl(event.senderFrame?.url ?? '', !app.isPackaged)
    }
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
    if (this.overlayView) {
      if (!this.window.isDestroyed()) this.window.contentView.removeChildView(this.overlayView)
      if (!this.overlayView.webContents.isDestroyed()) this.overlayView.webContents.close()
      this.overlayView = null
    }
    ipcMain.removeHandler('browser:getSnapshot'); ipcMain.removeHandler('browser:action'); ipcMain.removeHandler('browser:history')
  }
}
