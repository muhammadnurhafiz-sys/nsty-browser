import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { DEFAULT_BROWSER_PREFERENCES, type BrowserAction, type BrowserActionResult, type BrowserHistoryEntry, type BrowserOverlay, type BrowserSnapshot, type ContextCommand, type OverlaySurface } from '../../shared/browser'
import { createLogger } from '../utils/logger'
import { useShellTheme } from '../utils/theme'
import '../browser-shell.css'

const log = createLogger('OverlayShell')
const EMPTY: BrowserSnapshot = { revision: -1, tabs: [], activeTabId: null, activeSpace: 'Work', spaces: ['Work'], preferences: DEFAULT_BROWSER_PREFERENCES, bookmarks: [], history: [], downloads: [], extensions: [], pendingPermission: null, permissions: [], shieldExceptions: [], shieldReady: false, capabilities: { extensions: false, privateBrowsing: false }, overlay: null }
interface Bridge { getBrowserSnapshot(): Promise<BrowserSnapshot>; dispatchBrowserAction(action: BrowserAction): Promise<BrowserActionResult>; onBrowserSnapshot(callback: (snapshot: BrowserSnapshot) => void): () => void; searchHistory?(query: string, limit?: number): Promise<BrowserHistoryEntry[]>; platform?: string }
const bridge = () => window.nsty as unknown as Bridge | undefined
/** Surfaces that hang off a chrome control instead of covering the content area. */
const POPOVERS = new Set<OverlaySurface>(['menu', 'tabs', 'suggestions', 'find', 'context', 'site', 'shield'])
/** Popovers whose right edge lines up with the right edge of their anchor. */
const RIGHT_ALIGNED = new Set<OverlaySurface>(['menu', 'shield'])
const WIDTHS: Partial<Record<OverlaySurface, number>> = { menu: 300, tabs: 260, site: 300, shield: 320, context: 240 }
/** Rough height used to decide whether a context menu must flip above the click. */
const CONTEXT_HEIGHT = 340
const TITLES: Partial<Record<OverlaySurface, string>> = { history: 'History', bookmarks: 'Bookmarks', downloads: 'Downloads', extensions: 'Extensions', settings: 'Settings', shield: 'Nsty Shield', site: 'Site information', menu: 'Browser menu', bookmark: 'Save bookmark', tabs: 'Tab actions', clear: 'Clear browsing data', spaces: 'Spaces', permission: 'Site permission', auth: 'Sign in', find: 'Find in page bar', suggestions: 'Suggestions', context: 'Page actions' }
const SUGGESTION_ICON = { url: 'language', search: 'search', bookmark: 'bookmark', history: 'history' } as const
const hostOf = (url: string) => { try { return new URL(url).hostname } catch { return '' } }
const bytes = (value: number) => value < 1048576 ? `${Math.round(value / 1024)} KB` : `${(value / 1048576).toFixed(1)} MB`
function Icon({ name }: { name: string }) { return <span className="bs-icon" aria-hidden="true">{name}</span> }
function Button({ icon, label, onClick, disabled = false, children }: { icon?: string; label: string; onClick: () => void; disabled?: boolean; children?: ReactNode }) { return <button type="button" title={label} aria-label={label} onClick={onClick} disabled={disabled}>{icon && <Icon name={icon} />}{children}</button> }
/** One row of a menu surface; menus are keyboard-navigable lists of commands. */
function MenuItem({ icon, label, onClick, disabled = false }: { icon: string; label: string; onClick: () => void; disabled?: boolean }) {
  return <button type="button" role="menuitem" disabled={disabled} onClick={onClick}><Icon name={icon} />{label}</button>
}
function Divider() { return <hr className="bs-menu-divider" /> }
function Empty({ icon, children }: { icon: string; children: ReactNode }) { return <div className="bs-empty"><Icon name={icon} /><p>{children}</p></div> }

/** Absolute position of a popover inside the overlay view (window coords minus the content origin). */
function popoverStyle(overlay: BrowserOverlay): CSSProperties {
  const { surface, anchor, origin } = overlay
  if (surface === 'find') return { top: 8, right: 16 }
  const width = surface === 'suggestions' ? Math.max(240, anchor?.width ?? 320) : WIDTHS[surface] ?? 300
  const viewWidth = window.innerWidth || 1024, viewHeight = window.innerHeight || 768
  if (!anchor) return { top: 16, left: Math.max(8, Math.round((viewWidth - width) / 2)), width }
  // A context menu starts at the click itself and flips up or left near an edge.
  if (surface === 'context') {
    const point = { x: anchor.x - origin.x, y: anchor.y - origin.y }
    const height = Math.min(CONTEXT_HEIGHT, viewHeight - 16)
    const left = point.x + width > viewWidth - 8 ? point.x - width : point.x
    const top = point.y + height > viewHeight - 8 ? point.y - height : point.y
    return { top: Math.max(8, top), left: Math.max(8, left), width }
  }
  const top = Math.min(Math.max(8, Math.max(0, anchor.y + anchor.height - origin.y) + 6), Math.max(8, viewHeight - 60))
  const raw = RIGHT_ALIGNED.has(surface) ? anchor.x + anchor.width - origin.x - width : anchor.x - origin.x
  return { top, left: Math.max(8, Math.min(raw, Math.max(8, viewWidth - width - 8))), width }
}

export function OverlayShell() {
  const [state, setState] = useState<BrowserSnapshot>(EMPTY)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [find, setFind] = useState('')
  const [historyResults, setHistoryResults] = useState<BrowserHistoryEntry[]>([])
  const surfaceRef = useRef<HTMLDivElement>(null)
  const overlay = state.overlay
  const surface = overlay?.surface ?? null
  const active = state.tabs.find(tab => tab.id === state.activeTabId)
  const theme = useShellTheme(state.preferences.theme)
  const host = hostOf(active?.url ?? '')
  const locked = surface === 'permission' || surface === 'auth'
  const apply = useCallback((next: BrowserSnapshot) => setState(previous => next.revision > previous.revision ? next : previous), [])
  const send = useCallback(async (action: BrowserAction) => {
    log.info('overlay action', { type: action.type })
    try {
      const api = bridge()
      if (!api?.dispatchBrowserAction) throw new Error('Browser controls are unavailable.')
      const result = await api.dispatchBrowserAction(action)
      if (result.ok) apply(result.snapshot)
      else setError(result.error)
    } catch (cause) { log.warn('overlay action failed', { type: action.type }); setError(cause instanceof Error ? cause.message : 'Browser action failed') }
  }, [apply])
  useEffect(() => {
    log.info('connect overlay to native browser state')
    const api = bridge()
    if (!api?.getBrowserSnapshot) return
    const unsubscribe = api.onBrowserSnapshot(apply)
    let mounted = true
    api.getBrowserSnapshot().then(snapshot => { if (mounted) apply(snapshot) }).catch(() => log.warn('overlay could not hydrate'))
    return () => { mounted = false; unsubscribe() }
  }, [apply])
  const historyRef = useRef(state.history); historyRef.current = state.history
  const close = useCallback(() => { void send({ type: 'overlay:close' }) }, [send])
  /** Credential prompts are answered, never dismissed: Escape means cancel. */
  const authId = typeof state.overlay?.payload.id === 'string' ? state.overlay.payload.id : ''
  const cancelAuth = useCallback(() => { if (authId) void send({ type: 'auth:respond', id: authId }) }, [authId, send])
  const closeFind = useCallback(() => { void send({ type: 'find', text: '' }); void send({ type: 'overlay:close' }) }, [send])
  useEffect(() => { if (surface) { setQuery(''); setError('') } }, [surface])
  useEffect(() => {
    if (!surface) return
    log.debug('focus and trap the open surface', { surface })
    const container = surfaceRef.current
    const focusable = () => Array.from(container?.querySelectorAll<HTMLElement>('button:not([disabled]), input, select, [tabindex="0"]') ?? [])
    focusable()[0]?.focus()
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (surface === 'auth') { event.preventDefault(); cancelAuth(); return }
        if (locked) return
        event.preventDefault(); if (surface === 'find') closeFind(); else close(); return
      }
      if (surface === 'context' && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
        event.preventDefault()
        const items = focusable()
        const index = items.indexOf(document.activeElement as HTMLElement)
        const step = event.key === 'ArrowDown' ? 1 : -1
        items[(Math.max(0, index) + step + items.length) % items.length]?.focus()
        return
      }
      if (event.key !== 'Tab') return
      const elements = focusable(); const first = elements[0]; const last = elements[elements.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    }
    document.addEventListener('keydown', key)
    return () => document.removeEventListener('keydown', key)
  }, [surface, locked, close, closeFind, cancelAuth])
  useEffect(() => {
    if (surface !== 'history') return
    const search = bridge()?.searchHistory
    const recent = historyRef.current
    if (!search) { setHistoryResults(recent); return }
    let live = true
    const timer = setTimeout(() => {
      log.debug('query history')
      search(query, 200).then(results => { if (live) setHistoryResults(results) }).catch(() => { if (live) setHistoryResults(recent) })
    }, 120)
    return () => { live = false; clearTimeout(timer) }
  }, [surface, query])
  if (!overlay || !surface) return null
  const payload = overlay.payload
  const tabId = typeof payload.tabId === 'string' ? payload.tabId : state.activeTabId
  const target = state.tabs.find(tab => tab.id === tabId)
  const rows = payload.rows ?? []
  const highlight = typeof payload.highlight === 'number' ? payload.highlight : 0
  const act = (action: BrowserAction) => { void send(action); close() }
  // Context commands run against the page view; main closes the surface itself.
  const context = (command: ContextCommand, extra: { x?: number; y?: number; url?: string } = {}) => { void send({ type: 'context', command, ...extra }) }
  const flag = (key: string) => payload[key] === true
  const text = (key: string) => typeof payload[key] === 'string' ? payload[key] : ''
  const point = { x: typeof payload.x === 'number' ? payload.x : 0, y: typeof payload.y === 'number' ? payload.y : 0 }
  const navigate = (url: string) => act({ type: 'navigate', url })
  const openSurface = (next: OverlaySurface) => { void send({ type: 'overlay:open', surface: next }) }
  const list = surface === 'history' ? historyResults : state.bookmarks.filter(item => `${item.title} ${item.url}`.toLowerCase().includes(query.toLowerCase()))
  const body = <>
    {surface === 'permission' && state.pendingPermission && <><Icon name="admin_panel_settings" /><h3>{state.pendingPermission.origin}</h3><p>Wants to use {state.pendingPermission.permission}.</p><p className="bs-muted">Allow only if you trust this site.</p><div className="bs-actions">{([['Block', false, false], ['Allow this time', true, false], ['Always allow', true, true]] as const).map(([label, allow, remember]) => <button type="button" key={label} className={allow && !remember ? 'bs-primary' : undefined} onClick={() => { const id = state.pendingPermission?.id; if (id) void send({ type: 'permission:respond', id, allow, remember }) }}>{label}</button>)}</div></>}
    {(surface === 'history' || surface === 'bookmarks') && <><input className="bs-search" aria-label={`Search ${surface}`} placeholder={`Search ${surface}…`} value={query} onChange={event => setQuery(event.target.value)} />{surface === 'bookmarks' && <div className="bs-actions"><button type="button" onClick={() => void send({ type: 'bookmarks:import' })}>Import JSON</button><button type="button" onClick={() => void send({ type: 'bookmarks:export' })}>Export JSON</button></div>}{surface === 'history' && <button className="bs-text-button" type="button" onClick={() => openSurface('clear')}>Clear browsing data</button>}{list.map(item => <div className="bs-list-row" key={item.id}><Icon name={surface === 'bookmarks' ? 'bookmark' : 'history'} /><button type="button" className="bs-row-link" onClick={() => navigate(item.url)}><strong>{item.title || item.url}</strong><small>{item.url}</small>{'folder' in item && <small>{item.folder || 'Bookmarks'}</small>}</button>{surface === 'bookmarks' && <Button icon="delete" label={`Remove ${item.title}`} onClick={() => void send({ type: 'bookmark:remove', id: item.id })} />}{'visitedAt' in item && <time>{new Date(item.visitedAt).toLocaleDateString()}</time>}</div>)}{list.length === 0 && <Empty icon={surface === 'history' ? 'history' : 'bookmark'}>{surface === 'history' ? 'Pages you visit will appear here.' : 'Save a page using the bookmark button in the address bar.'}</Empty>}</>}
    {surface === 'bookmark' && <form className="bs-form" onSubmit={event => { event.preventDefault(); const data = new FormData(event.currentTarget); act({ type: 'bookmark:add', title: String(data.get('title')), url: String(data.get('url')), folder: String(data.get('folder')) }) }}><label>Name<input name="title" defaultValue={active?.title ?? ''} required /></label><label>URL<input name="url" defaultValue={active?.url ?? ''} required /></label><label>Folder<input name="folder" defaultValue="Favorites" /></label><button type="submit" className="bs-primary">Save bookmark</button></form>}
    {surface === 'downloads' && <>{state.downloads.length === 0 && <Empty icon="download">Your downloads will appear here.</Empty>}{state.downloads.map(item => <div className="bs-download" key={item.id}><div className="bs-list-row"><Icon name="description" /><div className="bs-grow"><strong>{item.name}</strong><small>{item.state} · {bytes(item.received)}{item.total > 0 ? ` of ${bytes(item.total)}` : ''}</small></div></div>{item.state === 'progressing' && <progress aria-label={`${item.name} progress`} value={item.received} max={item.total || undefined} />}<div className="bs-actions">{item.state === 'progressing' && <button type="button" onClick={() => void send({ type: 'download:pause', id: item.id })}>Pause</button>}{(item.state === 'paused' || item.state === 'interrupted') && <button type="button" onClick={() => void send({ type: 'download:resume', id: item.id })}>Resume</button>}{['progressing', 'paused', 'interrupted'].includes(item.state) && <button type="button" onClick={() => void send({ type: 'download:cancel', id: item.id })}>Cancel</button>}{item.state === 'completed' && <><button type="button" onClick={() => void send({ type: 'download:open', id: item.id })}>Open file</button><button type="button" onClick={() => void send({ type: 'download:folder', id: item.id })}>Show in folder</button></>}</div></div>)}</>}
    {surface === 'extensions' && <><p>Add compatible unpacked Chromium extensions from a folder on your computer. Electron supports a subset of extension APIs; Chrome Web Store installation is unavailable.</p><button className="bs-primary" type="button" disabled={!state.capabilities.extensions} onClick={() => void send({ type: 'extensions:load' })}>Load unpacked extension</button>{state.extensions.length === 0 && <Empty icon="extension">No extensions installed.</Empty>}{state.extensions.map(item => <div className="bs-download" key={item.id}><div className="bs-list-row"><Icon name="extension" /><div className="bs-grow"><strong>{item.name}</strong><small>Version {item.version} · {item.enabled ? 'Enabled' : 'Disabled'}</small></div></div><div className="bs-actions"><button type="button" onClick={() => void send({ type: 'extension:toggle', id: item.id })}>{item.enabled ? 'Disable' : 'Enable'}</button><button type="button" onClick={() => void send({ type: 'extension:pin', id: item.id })}>{item.pinned ? 'Unpin' : 'Pin'}</button><button type="button" disabled={!item.enabled} onClick={() => act({ type: 'extension:open', id: item.id })}>Open</button><button type="button" onClick={() => void send({ type: 'extension:remove', id: item.id })}>Remove</button></div></div>)}</>}
    {surface === 'settings' && <><h3>Appearance</h3><p>Quiet colors. Clear focus. Your choice.</p><div className="bs-palettes">{(['graphite', 'paper', 'system'] as const).map(value => <button type="button" key={value} aria-pressed={state.preferences.theme === value} className={`bs-palette ${value}`} onClick={() => void send({ type: 'preferences', patch: { theme: value } })}><span className="bs-palette-sample"><i /><i /><i /></span><strong>{value === 'graphite' ? 'Graphite Sage' : value === 'paper' ? 'Warm Paper' : 'Follow system'}</strong><small>{value === 'system' ? 'Automatic light & dark' : value === 'graphite' ? 'Dark · soft sage' : 'Light · warm olive'}</small></button>)}</div><h3>Browsing</h3><label className="bs-setting"><span>Search engine</span><select aria-label="Search engine" value={state.preferences.searchEngine} onChange={event => void send({ type: 'preferences', patch: { searchEngine: event.target.value as typeof state.preferences.searchEngine } })}><option value="google">Google</option><option value="duckduckgo">DuckDuckGo</option><option value="bing">Bing</option><option value="brave">Brave Search</option></select></label>{([['restoreTabs', 'Restore tabs on startup'], ['downloadAsk', 'Ask where to save downloads'], ['reduceMotion', 'Reduce motion'], ['shield', 'Block ads and trackers'], ['youtube', 'YouTube filtering']] as const).map(([key, label]) => <label className="bs-setting" key={key}><span>{label}</span><input type="checkbox" checked={state.preferences[key]} onChange={event => void send({ type: 'preferences', patch: { [key]: event.target.checked } })} /></label>)}<p className="bs-muted">YouTube filtering depends on current filter coverage and may not remove every video ad.</p><h3>Privacy and storage</h3><button type="button" onClick={() => openSurface('clear')}>Clear browsing data</button><h3>Site permissions</h3>{state.permissions.length === 0 && <p className="bs-muted">No saved permission decisions.</p>}{state.permissions.map(item => <div className="bs-list-row" key={`${item.origin}:${item.permission}`}><div className="bs-grow"><strong>{item.origin}</strong><small>{item.permission} · {item.allowed ? 'Allowed' : 'Blocked'}</small></div><Button icon="delete" label={`Reset ${item.permission} for ${item.origin}`} onClick={() => void send({ type: 'permission:remove', origin: item.origin, permission: item.permission })} /></div>)}<p className="bs-muted">Local profile · bookmarks and settings stay on this device. Account sync and a password manager are not available.</p></>}
    {surface === 'shield' && <><div className="bs-shield-summary"><Icon name="shield" /><strong>{active?.blocked ?? 0}</strong><span>requests blocked on this page</span></div><p>{host || 'Open a website to manage its protection.'}</p><label className="bs-setting"><span>Block ads and trackers</span><input type="checkbox" checked={state.preferences.shield} onChange={event => void send({ type: 'preferences', patch: { shield: event.target.checked } })} /></label>{host && <label className="bs-setting"><span>Protection for {host}</span><input type="checkbox" checked={!state.shieldExceptions.includes(host)} onChange={event => void send({ type: 'shield:site', host, enabled: event.target.checked })} /></label>}<label className="bs-setting"><span>YouTube filtering</span><input type="checkbox" checked={state.preferences.youtube} onChange={event => void send({ type: 'preferences', patch: { youtube: event.target.checked } })} /></label><p className="bs-muted">{state.shieldReady ? 'Filter lists loaded.' : 'Filter lists are preparing.'} If a page breaks, pause protection for this site and reload. Video ad filtering is best effort.</p><button type="button" disabled={!active?.url} onClick={() => act({ type: 'reload' })}>Reload page</button></>}
    {surface === 'site' && <><Icon name={active?.url.startsWith('https:') ? 'lock' : 'info'} /><h3>{host || 'New tab'}</h3><p>{active?.url.startsWith('https:') ? 'This page uses an HTTPS connection.' : active?.url ? 'This page does not use HTTPS.' : 'Site information appears after you open a page.'}</p><p className="bs-muted">A secure connection does not guarantee that a site is trustworthy.</p><button type="button" onClick={() => openSurface('shield')}>Site protection</button><h3>Permissions</h3>{state.permissions.filter(item => hostOf(item.origin) === host).map(item => <div className="bs-setting" key={item.permission}><span>{item.permission} · {item.allowed ? 'Allowed' : 'Blocked'}</span><button type="button" onClick={() => void send({ type: 'permission:remove', origin: item.origin, permission: item.permission })}>Reset</button></div>)}<p className="bs-muted">Sites request access to camera, microphone and location when needed.</p></>}
    {surface === 'clear' && <form className="bs-form" onSubmit={event => { event.preventDefault(); const data = new FormData(event.currentTarget); act({ type: 'clear-data', history: data.has('history'), cookies: data.has('cookies'), cache: data.has('cache') }) }}><p>Remove selected data from this device. Clearing cookies signs you out of websites.</p>{['history', 'cookies', 'cache'].map(key => <label className="bs-setting" key={key}><span>{key === 'history' ? 'Browsing history' : key === 'cookies' ? 'Cookies and site data' : 'Cached files'}</span><input type="checkbox" name={key} defaultChecked={key === 'history'} /></label>)}<button className="bs-primary" type="submit">Clear selected data</button></form>}
    {surface === 'spaces' && <><form className="bs-form" onSubmit={event => { event.preventDefault(); const data = new FormData(event.currentTarget); const name = String(data.get('name')).trim(); event.currentTarget.reset(); if (name) act({ type: 'space:create', name }) }}><label>New space<input name="name" maxLength={40} placeholder="Research" required /></label><button type="submit" className="bs-primary">Create space</button></form>{state.spaces.map(name => <div className="bs-list-row" key={name}><Icon name="workspaces" /><div className="bs-grow"><strong>{name}</strong><small>{state.tabs.filter(tab => tab.space === name).length} tabs{name === state.activeSpace ? ' · current' : ''}</small></div><button type="button" onClick={() => void send({ type: 'space', name })} disabled={name === state.activeSpace}>Open</button><Button icon="delete" label={`Remove ${name}`} disabled={state.spaces.length <= 1} onClick={() => void send({ type: 'space:remove', name })} /></div>)}<p className="bs-muted">Removing a space moves its tabs to your first space.</p></>}
    {surface === 'tabs' && <div className="bs-menu">{target && <><button type="button" role="menuitem" onClick={() => act({ type: 'tab:duplicate', id: target.id })}><Icon name="content_copy" />Duplicate tab</button><button type="button" role="menuitem" onClick={() => act({ type: 'tab:mute', id: target.id })}><Icon name="volume_off" />{target.muted ? 'Unmute' : 'Mute'} tab</button><button type="button" role="menuitem" onClick={() => act({ type: 'tab:close', id: target.id })}><Icon name="close" />Close tab</button></>}<button type="button" role="menuitem" onClick={() => act({ type: 'tab:reopen' })}><Icon name="restore" />Reopen closed tab</button></div>}
    {surface === 'menu' && <div className="bs-menu"><button type="button" role="menuitem" onClick={() => act({ type: 'tab:new' })}><Icon name="add" />New tab<kbd>Ctrl T</kbd></button><button type="button" role="menuitem" disabled={!state.capabilities.privateBrowsing} onClick={() => act({ type: 'tab:new', private: true })}><Icon name="visibility_off" />New private tab</button>{(['history', 'bookmarks', 'downloads', 'extensions'] as const).map(value => <button type="button" role="menuitem" key={value} onClick={() => openSurface(value)}><Icon name={value === 'extensions' ? 'extension' : value === 'downloads' ? 'download' : value} />{TITLES[value]}</button>)}<button type="button" role="menuitem" onClick={() => void send({ type: 'overlay:open', surface: 'tabs', ...(active ? { payload: { tabId: active.id } } : {}) })}><Icon name="tab" />Tab actions</button><div className="bs-menu-zoom"><span>Zoom</span><Button icon="remove" label="Zoom out" disabled={!active} onClick={() => void send({ type: 'zoom', value: Math.max(0.5, Math.round(((active?.zoom ?? 1) - 0.1) * 100) / 100) })} /><button type="button" onClick={() => void send({ type: 'zoom', value: 1 })}>{Math.round((active?.zoom ?? 1) * 100)}%</button><Button icon="add" label="Zoom in" disabled={!active} onClick={() => void send({ type: 'zoom', value: Math.min(2, Math.round(((active?.zoom ?? 1) + 0.1) * 100) / 100) })} /></div><button type="button" role="menuitem" onClick={() => openSurface('find')}><Icon name="search" />Find in page<kbd>Ctrl F</kbd></button>{([['print', 'print', 'Print'], ['save-page', 'save', 'Save page'], ['devtools', 'code', 'Developer tools']] as const).map(([type, icon, label]) => <button type="button" role="menuitem" key={type} disabled={!active?.url} onClick={() => act({ type })}><Icon name={icon} />{label}</button>)}<button type="button" role="menuitem" onClick={() => openSurface('settings')}><Icon name="settings" />Settings</button></div>}
    {surface === 'find' && <><input aria-label="Find in page" value={find} onChange={event => { setFind(event.target.value); void send({ type: 'find', text: event.target.value }) }} onKeyDown={event => { if (event.key !== 'Enter') return; event.preventDefault(); void send({ type: 'find', text: find, forward: !event.shiftKey }) }} placeholder="Find in page" /><span className="bs-find-count" aria-live="polite">{active?.find ? `${active.find.active} of ${active.find.total}` : ''}</span><Button icon="arrow_upward" label="Previous match" onClick={() => void send({ type: 'find', text: find, forward: false })} /><Button icon="arrow_downward" label="Next match" onClick={() => void send({ type: 'find', text: find })} /><Button icon="close" label="Close find" onClick={closeFind} /></>}
    {surface === 'context' && <div className="bs-menu">
      <MenuItem icon="arrow_back" label="Back" disabled={!flag('canGoBack')} onClick={() => act({ type: 'back' })} />
      <MenuItem icon="arrow_forward" label="Forward" disabled={!flag('canGoForward')} onClick={() => act({ type: 'forward' })} />
      <MenuItem icon="refresh" label="Reload" onClick={() => act({ type: 'reload' })} />
      <Divider />
      {text('linkURL') && <><MenuItem icon="open_in_new" label="Open link in new tab" onClick={() => context('open-link', { url: text('linkURL') })} />
        <MenuItem icon="visibility_off" label="Open link in private tab" onClick={() => context('open-link-private', { url: text('linkURL') })} />
        <MenuItem icon="link" label="Copy link address" onClick={() => context('copy-link', { url: text('linkURL') })} />
        <Divider /></>}
      {payload.mediaType === 'image' && <><MenuItem icon="image" label="Copy image address" onClick={() => context('copy-image', { url: text('srcURL') })} />
        <MenuItem icon="download" label="Save image" onClick={() => context('save-image', { url: text('srcURL') })} />
        <Divider /></>}
      <MenuItem icon="save" label="Save page as…" onClick={() => act({ type: 'save-page' })} />
      <MenuItem icon="print" label="Print…" onClick={() => act({ type: 'print' })} />
      <Divider />
      {flag('isEditable')
        ? <><MenuItem icon="content_cut" label="Cut" disabled={!flag('canCut')} onClick={() => context('cut')} />
          <MenuItem icon="content_copy" label="Copy" disabled={!flag('canCopy')} onClick={() => context('copy')} />
          <MenuItem icon="content_paste" label="Paste" disabled={!flag('canPaste')} onClick={() => context('paste')} />
          <MenuItem icon="select_all" label="Select all" onClick={() => context('select-all')} /></>
        : <><MenuItem icon="select_all" label="Select all" onClick={() => context('select-all')} />
          <MenuItem icon="content_copy" label="Copy" disabled={!flag('canCopy')} onClick={() => context('copy')} /></>}
      <Divider />
      <MenuItem icon="code" label="Inspect" onClick={() => context('inspect', point)} />
    </div>}
    {surface === 'auth' && <form className="bs-form" onSubmit={event => { event.preventDefault(); const data = new FormData(event.currentTarget); void send({ type: 'auth:respond', id: authId, username: String(data.get('username')), password: String(data.get('password')) }) }}>
      <p>Sign in to {text('host') || 'this site'}{payload.isProxy === true ? ' (proxy)' : ''}</p>
      {text('realm') && <p className="bs-muted">{text('realm')}</p>}
      <label>Username<input name="username" autoComplete="off" /></label>
      <label>Password<input name="password" type="password" autoComplete="off" /></label>
      <div className="bs-actions"><button type="button" onClick={cancelAuth}>Cancel</button><button type="submit" className="bs-primary">Sign in</button></div>
    </form>}
    {surface === 'suggestions' && rows.map((row, index) => <button type="button" role="option" aria-selected={index === highlight} key={`${row.kind}:${row.title}`} className={index === highlight ? 'highlight' : ''} disabled={!row.url} onMouseEnter={() => void send({ type: 'suggest:highlight', index })} onClick={() => { void send({ type: 'suggest:highlight', index }); void send({ type: 'suggest:accept' }) }}><Icon name={SUGGESTION_ICON[row.kind]} /><span>{row.title}{row.kind !== 'search' && <small>{row.url}</small>}</span>{index === highlight && <kbd>↵</kbd>}</button>)}
  </>
  const popover = POPOVERS.has(surface)
  const role = surface === 'menu' || surface === 'tabs' || surface === 'context' ? 'menu' : surface === 'suggestions' ? 'listbox' : 'dialog'
  log.debug('render overlay surface', { surface, theme })
  return <div className={`browser-shell bs-overlay-root ${popover ? 'bs-overlay-popover' : ''}`} data-theme={theme} data-reduce-motion={state.preferences.reduceMotion} data-platform={bridge()?.platform ?? 'web'} onMouseDown={event => { if (event.target === event.currentTarget && !locked) close() }}>
    {popover
      // role is one of menu/listbox/dialog, all of which accept aria-label; spread
      // because the linter cannot narrow the dynamic role attribute.
      ? <div ref={surfaceRef} className={`bs-popover bs-popover-${surface}${surface === 'find' ? ' bs-find' : surface === 'suggestions' ? ' bs-suggestions' : ''}`} style={popoverStyle(overlay)} {...{ role, 'aria-label': TITLES[surface] ?? surface }}>{body}</div>
      : <div className="bs-backdrop" onMouseDown={event => { if (event.target === event.currentTarget && !locked) close() }}><div ref={surfaceRef} className="bs-dialog" role="dialog" aria-modal="true" aria-labelledby="bs-dialog-title"><header><div><span className="bs-eyebrow">NSTY BROWSER</span><h2 id="bs-dialog-title">{TITLES[surface] ?? ''}</h2></div>{!locked && <Button icon="close" label="Close dialog" onClick={close} />}</header><div className="bs-dialog-body">{body}</div></div></div>}
    {error && <div className="bs-toast" role="alert"><span>{error}</span><Button icon="close" label="Dismiss error" onClick={() => setError('')} /></div>}
  </div>
}
