import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { DEFAULT_BROWSER_PREFERENCES, type BrowserAction, type BrowserActionResult, type BrowserHistoryEntry, type BrowserSnapshot } from '../shared/browser'
import { createLogger } from './utils/logger'
import './browser-shell.css'

const log = createLogger('BrowserShell')
const EMPTY: BrowserSnapshot = { revision: -1, tabs: [], activeTabId: null, activeSpace: 'Work', spaces: ['Work'], preferences: DEFAULT_BROWSER_PREFERENCES, bookmarks: [], history: [], downloads: [], extensions: [], pendingPermission: null, permissions: [], shieldExceptions: [], shieldReady: false, capabilities: { extensions: false, privateBrowsing: false } }
type Panel = 'history' | 'bookmarks' | 'downloads' | 'extensions' | 'settings' | 'shield' | 'site' | 'menu' | 'bookmark' | 'tabs' | 'clear' | 'spaces' | null
interface Bridge { getBrowserSnapshot(): Promise<BrowserSnapshot>; dispatchBrowserAction(action: BrowserAction): Promise<BrowserActionResult>; onBrowserSnapshot(callback: (snapshot: BrowserSnapshot) => void): () => void; searchHistory?(query: string, limit?: number): Promise<BrowserHistoryEntry[]>; onBrowserShortcut?(callback: (key: string) => void): () => void; platform?: string }
const bridge = () => window.nsty as unknown as Bridge | undefined
const hostOf = (url: string) => { try { return new URL(url).hostname } catch { return '' } }
const bytes = (value: number) => value < 1048576 ? `${Math.round(value / 1024)} KB` : `${(value / 1048576).toFixed(1)} MB`
function Icon({ name }: { name: string }) { return <span className="bs-icon" aria-hidden="true">{name}</span> }
function Button({ icon, label, onClick, disabled = false, children }: { icon?: string; label: string; onClick: () => void; disabled?: boolean; children?: ReactNode }) { return <button type="button" title={label} aria-label={label} onClick={onClick} disabled={disabled}>{icon && <Icon name={icon} />}{children}</button> }
function Empty({ icon, children }: { icon: string; children: ReactNode }) { return <div className="bs-empty"><Icon name={icon} /><p>{children}</p></div> }

export function BrowserShell() {
  const [state, setState] = useState<BrowserSnapshot>(EMPTY)
  const [panel, setPanel] = useState<Panel>(null)
  const [address, setAddress] = useState('')
  const [suggestions, setSuggestions] = useState(false)
  const [query, setQuery] = useState('')
  const [find, setFind] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [historyResults, setHistoryResults] = useState<BrowserHistoryEntry[]>([])
  const [systemDark, setSystemDark] = useState(() => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true)
  const addressRef = useRef<HTMLInputElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const findRef = useRef<HTMLInputElement>(null)
  const active = state.tabs.find(tab => tab.id === state.activeTabId)
  const theme = state.preferences.theme === 'system' ? (systemDark ? 'graphite' : 'paper') : state.preferences.theme
  const host = hostOf(active?.url ?? '')
  const modal = Boolean(panel || state.pendingPermission)
  const overlay = modal || suggestions
  const apply = useCallback((next: BrowserSnapshot) => setState(previous => next.revision > previous.revision ? next : previous), [])
  const send = useCallback(async (action: BrowserAction) => {
    log.info('browser action', { type: action.type })
    try {
      const api = bridge()
      if (!api?.dispatchBrowserAction) throw new Error('Open Nsty in the desktop app to use browser controls.')
      const result = await api.dispatchBrowserAction(action)
      if (result.ok) apply(result.snapshot)
      else setError(result.error)
    } catch (cause) { log.warn('browser action failed', { type: action.type }); setError(cause instanceof Error ? cause.message : 'Browser action failed') }
  }, [apply])
  useEffect(() => {
    log.info('connect native browser state')
    const api = bridge()
    if (!api?.getBrowserSnapshot) { setError('Browser engine unavailable. Launch the Nsty desktop application.'); return }
    const unsubscribe = api.onBrowserSnapshot(apply)
    let mounted = true
    api.getBrowserSnapshot().then(snapshot => { if (mounted) apply(snapshot) }).catch(() => { if (mounted) setError('Could not connect to the browser engine.') })
    return () => { mounted = false; unsubscribe() }
  }, [apply])
  useEffect(() => { setAddress(active?.url ?? '') }, [active?.url, active?.id])
  useEffect(() => {
    log.debug('watch system palette')
    const media = window.matchMedia?.('(prefers-color-scheme: dark)')
    const change = () => setSystemDark(media?.matches ?? true)
    media?.addEventListener('change', change)
    return () => media?.removeEventListener('change', change)
  }, [])
  useEffect(() => { void send({ type: 'overlay', open: overlay }) }, [overlay, send])
  useEffect(() => {
    if (!modal) return
    log.debug('focus modal')
    const previous = document.activeElement as HTMLElement | null
    const dialog = dialogRef.current
    const focusable = () => Array.from(dialog?.querySelectorAll<HTMLElement>('button:not([disabled]), input, select, [tabindex="0"]') ?? [])
    focusable()[0]?.focus()
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !state.pendingPermission) { event.preventDefault(); setPanel(null) }
      if (event.key !== 'Tab') return
      const elements = focusable(); const first = elements[0]; const last = elements[elements.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    }
    document.addEventListener('keydown', key)
    return () => { document.removeEventListener('keydown', key); previous?.focus() }
  }, [modal, state.pendingPermission])
  useEffect(() => {
    log.debug('register browser shortcuts')
    const key = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return
      const value = event.key.toLowerCase()
      if (!['l', 't', 'w', 'f', 'h', 'j', 'd', 'p'].includes(value)) return
      event.preventDefault()
      if (value === 'l') { addressRef.current?.focus(); addressRef.current?.select() }
      if (value === 't') void send({ type: event.shiftKey ? 'tab:reopen' : 'tab:new' })
      if (value === 'w' && active) void send({ type: 'tab:close', id: active.id })
      if (value === 'f') setFind('')
      if (value === 'h') setPanel('history')
      if (value === 'j') setPanel('downloads')
      if (value === 'd') setPanel('bookmark')
      if (value === 'p') void send({ type: 'print' })
    }
    document.addEventListener('keydown', key)
    return () => document.removeEventListener('keydown', key)
  }, [active, send])
  useEffect(() => {
    const api = bridge()
    if (!api?.onBrowserShortcut) return
    log.debug('listen for shortcuts forwarded from page views')
    return api.onBrowserShortcut(key => {
      if (key === 'l') { addressRef.current?.focus(); addressRef.current?.select() }
      if (key === 'f') setFind('')
      if (key === 'h') setPanel('history')
      if (key === 'j') setPanel('downloads')
    })
  }, [])
  useEffect(() => { if (find !== null) findRef.current?.focus() }, [find === null])
  useEffect(() => {
    if (panel !== 'history') return
    const api = bridge()
    const search = api?.searchHistory
    if (!search) { setHistoryResults(state.history); return }
    let live = true
    const timer = setTimeout(() => {
      log.debug('query history')
      search(query, 200).then(results => { if (live) setHistoryResults(results) }).catch(() => { if (live) setHistoryResults(state.history) })
    }, 120)
    return () => { live = false; clearTimeout(timer) }
  }, [panel, query, state.revision])
  const open = (next: Panel) => { setQuery(''); setSuggestions(false); setPanel(next) }
  const navigate = (url: string) => { setPanel(null); setSuggestions(false); void send({ type: 'navigate', url }) }
  const menuAction = (action: BrowserAction) => { setPanel(null); void send(action) }
  const matches = [...state.bookmarks, ...state.history].filter(item => `${item.title} ${item.url}`.toLowerCase().includes(address.toLowerCase())).filter((item, index, list) => list.findIndex(other => other.url === item.url) === index).slice(0, 6)
  const titles: Record<NonNullable<Panel>, string> = { history: 'History', bookmarks: 'Bookmarks', downloads: 'Downloads', extensions: 'Extensions', settings: 'Settings', shield: 'Nsty Shield', site: 'Site information', menu: 'Browser menu', bookmark: 'Save bookmark', tabs: 'Tab actions', clear: 'Clear browsing data', spaces: 'Spaces' }
  log.debug('render browser chrome', { revision: state.revision, theme })
  return <div className="browser-shell" data-theme={theme} data-reduce-motion={state.preferences.reduceMotion} data-platform={bridge()?.platform ?? 'web'}>
    <a className="bs-skip" href="#browser-content">Skip to content</a>
    <header className="bs-toolbar">
      <div className="bs-brand"><span className="bs-logo">n.</span><strong>nsty</strong><span className="bs-beta">BROWSER</span></div>
      <div className="bs-navigation"><Button icon="arrow_back" label="Back" disabled={!active?.canGoBack} onClick={() => void send({ type: 'back' })} /><Button icon="arrow_forward" label="Forward" disabled={!active?.canGoForward} onClick={() => void send({ type: 'forward' })} /><Button icon={active?.loading ? 'close' : 'refresh'} label={active?.loading ? 'Stop loading' : 'Reload'} disabled={!active?.url} onClick={() => void send({ type: active?.loading ? 'stop' : 'reload' })} /></div>
      <form className="bs-address" onSubmit={event => { event.preventDefault(); navigate(address) }}>
        <Button icon={active?.private ? 'visibility_off' : 'tune'} label="Site information" onClick={() => open('site')} />
        <input ref={addressRef} aria-label="Address and search" placeholder="Search or enter a website" value={address} onChange={event => { setAddress(event.target.value); setSuggestions(true) }} onFocus={() => setSuggestions(true)} onKeyDown={event => { if (event.key === 'Escape') setSuggestions(false) }} />
        <Button icon="bookmark_add" label="Bookmark this page" disabled={!active?.url} onClick={() => open('bookmark')} />
      </form>
      <div className="bs-tools"><Button icon="shield" label="Open Shield" onClick={() => open('shield')} /><Button icon="extension" label="Extensions" onClick={() => open('extensions')} /><Button icon="download" label="Downloads" onClick={() => open('downloads')} /><Button icon="more_horiz" label="Browser menu" onClick={() => open('menu')} /></div>
    </header>
    <aside className="bs-sidebar"><div className="bs-workspace"><span className="bs-space-dot" /><select aria-label="Workspace" value={state.activeSpace} onChange={event => void send({ type: 'space', name: event.target.value })}>{Array.from(new Set([...state.spaces, state.activeSpace])).map(name => <option key={name}>{name}</option>)}</select><Button icon="workspaces" label="Manage spaces" onClick={() => open('spaces')} /></div>
      <div className="bs-sidebar-section"><span className="bs-kicker">FAVORITES</span><Button icon="bookmarks" label="Open bookmarks" onClick={() => open('bookmarks')} /></div>
      <div className="bs-favorites">{state.bookmarks.slice(0, 6).map(bookmark => <Button key={bookmark.id} label={bookmark.title} onClick={() => navigate(bookmark.url)}><span>{(bookmark.title || hostOf(bookmark.url)).slice(0, 1).toUpperCase()}</span></Button>)}{state.bookmarks.length === 0 && <p>Save your favorite pages here.</p>}</div>
      <div className="bs-sidebar-section"><span className="bs-kicker">YOUR TABS</span><span className="bs-count">{state.tabs.filter(tab => tab.space === state.activeSpace).length}</span></div>
      <div className="bs-tabs">{state.tabs.filter(tab => tab.space === state.activeSpace).map(tab => <div key={tab.id} className={`bs-tab ${tab.id === state.activeTabId ? 'selected' : ''}`} onContextMenu={event => { event.preventDefault(); void send({ type: 'tab:select', id: tab.id }); open('tabs') }}><Button label={`Select ${tab.title || 'New tab'}`} onClick={() => void send({ type: 'tab:select', id: tab.id })}><Icon name={tab.private ? 'visibility_off' : tab.loading ? 'progress_activity' : tab.muted ? 'volume_off' : 'language'} /><span>{tab.title || 'New tab'}</span></Button><Button icon="close" label={`Close ${tab.title || 'New tab'}`} onClick={() => void send({ type: 'tab:close', id: tab.id })} /></div>)}</div>
      <button className="bs-new-tab" type="button" aria-label="New tab" onClick={() => void send({ type: 'tab:new' })}><Icon name="add" />New tab<kbd>⌘ / Ctrl T</kbd></button>
      <div className="bs-sidebar-bottom"><button type="button" onClick={() => open('shield')}><Icon name="verified_user" /><span>Shield {state.preferences.shield ? 'enabled' : 'paused'}<small>{state.shieldReady ? 'Protection is ready' : 'Preparing filter lists'}</small></span><span className="bs-status-dot" /></button><div><Button icon="history" label="History" onClick={() => open('history')} /><span className="bs-profile">Local browser</span><Button icon="settings" label="Settings" onClick={() => open('settings')} /></div></div>
    </aside>
    <main id="browser-content" tabIndex={-1} className="bs-content">{(!active?.url || active.error) && <div className="bs-dashboard">{active?.error ? <><Icon name="cloud_off" /><h1>This page couldn’t load</h1><p>{active.error}</p><button className="bs-primary" type="button" onClick={() => void send({ type: 'reload' })}>Try again</button></> : <><span className="bs-eyebrow">A LITTLE LESS NOISE. A LITTLE MORE SPACE.</span><h1>Your browser.<br /><em>Your own pace.</em></h1><p>A fresh start for whatever comes next.</p><form className="bs-dashboard-search" onSubmit={event => { event.preventDefault(); const data = new FormData(event.currentTarget); navigate(String(data.get('search'))) }}><Icon name="search" /><input name="search" aria-label="Search the web" placeholder="Search the web or enter a URL" required /><button type="submit" aria-label="Search"><Icon name="arrow_forward" /></button></form><div className="bs-cards"><button type="button" onClick={() => open('bookmarks')}><Icon name="bookmarks" /><strong>Your favorites</strong><span>{state.bookmarks.length} saved pages, always close.</span></button><button type="button" onClick={() => open('history')}><Icon name="history" /><strong>Pick up where you left off</strong><span>Find a page in your browsing history.</span></button><button type="button" onClick={() => open('shield')}><Icon name="shield" /><strong>A quieter web</strong><span>Manage protection for each site.</span></button></div><span className="bs-dashboard-footer">{active?.private ? 'Private tab · activity is not saved to history' : `${theme === 'graphite' ? 'Graphite Sage' : 'Warm Paper'} · Made for your everyday`}</span></>}</div>}</main>
    {find !== null && <form className="bs-find" onSubmit={event => { event.preventDefault(); void send({ type: 'find', text: find }) }}><input ref={findRef} aria-label="Find in page" value={find} onChange={event => setFind(event.target.value)} placeholder="Find in page" /><Button icon="arrow_upward" label="Previous match" onClick={() => void send({ type: 'find', text: find, forward: false })} /><Button icon="arrow_downward" label="Next match" onClick={() => void send({ type: 'find', text: find })} /><Button icon="close" label="Close find" onClick={() => { setFind(null); void send({ type: 'find', text: '' }) }} /></form>}
    {suggestions && !modal && <><button className="bs-suggestion-backdrop" type="button" aria-label="Close suggestions" onClick={() => setSuggestions(false)} /><div className="bs-suggestions"><button type="button" onClick={() => navigate(address)}><Icon name="search" /><span>{address ? `Go to or search “${address}”` : 'Type a website or search above'}</span></button>{matches.map(item => <button type="button" key={item.url} onClick={() => navigate(item.url)}><Icon name="history" /><span>{item.title}<small>{item.url}</small></span><Icon name="north_west" /></button>)}</div></>}
    {error && <div className="bs-toast" role="alert"><span>{error}</span><Button icon="close" label="Dismiss error" onClick={() => setError('')} /></div>}
    {modal && <div className="bs-backdrop" onMouseDown={event => { if (event.target === event.currentTarget && !state.pendingPermission) setPanel(null) }}><div ref={dialogRef} className={`bs-dialog ${panel === 'menu' || panel === 'tabs' ? 'bs-dialog-compact' : ''}`} role="dialog" aria-modal="true" aria-labelledby="bs-dialog-title"><header><div><span className="bs-eyebrow">NSTY BROWSER</span><h2 id="bs-dialog-title">{state.pendingPermission ? 'Site permission' : panel ? titles[panel] : ''}</h2></div>{!state.pendingPermission && <Button icon="close" label="Close dialog" onClick={() => setPanel(null)} />}</header><div className="bs-dialog-body">
      {state.pendingPermission ? <><Icon name="admin_panel_settings" /><h3>{state.pendingPermission.origin}</h3><p>Wants to use {state.pendingPermission.permission}.</p><p className="bs-muted">Allow only if you trust this site.</p><div className="bs-actions"><button type="button" onClick={() => void send({ type: 'permission:respond', id: state.pendingPermission!.id, allow: false, remember: false })}>Block</button><button type="button" className="bs-primary" onClick={() => void send({ type: 'permission:respond', id: state.pendingPermission!.id, allow: true, remember: false })}>Allow this time</button><button type="button" onClick={() => void send({ type: 'permission:respond', id: state.pendingPermission!.id, allow: true, remember: true })}>Always allow</button></div></> : <>
      {(panel === 'history' || panel === 'bookmarks') && <><input className="bs-search" aria-label={`Search ${panel}`} placeholder={`Search ${panel}…`} value={query} onChange={event => setQuery(event.target.value)} />{panel === 'bookmarks' && <div className="bs-actions"><button type="button" onClick={() => void send({ type: 'bookmarks:import' })}>Import HTML</button><button type="button" onClick={() => void send({ type: 'bookmarks:export' })}>Export HTML</button></div>}{panel === 'history' && <button className="bs-text-button" type="button" onClick={() => open('clear')}>Clear browsing data</button>}{(panel === 'history' ? historyResults : state.bookmarks.filter(item => `${item.title} ${item.url}`.toLowerCase().includes(query.toLowerCase()))).map(item => <div className="bs-list-row" key={item.id}><Icon name={panel === 'bookmarks' ? 'bookmark' : 'history'} /><button type="button" className="bs-row-link" onClick={() => navigate(item.url)}><strong>{item.title || item.url}</strong><small>{item.url}</small>{'folder' in item && <small>{item.folder || 'Bookmarks'}</small>}</button>{panel === 'bookmarks' && <Button icon="delete" label={`Remove ${item.title}`} onClick={() => void send({ type: 'bookmark:remove', id: item.id })} />}{'visitedAt' in item && <time>{new Date(item.visitedAt).toLocaleDateString()}</time>}</div>)}{(panel === 'history' ? historyResults : state.bookmarks).length === 0 && <Empty icon={panel === 'history' ? 'history' : 'bookmark'}>{panel === 'history' ? 'Pages you visit will appear here.' : 'Save a page using the bookmark button in the address bar.'}</Empty>}</>}
      {panel === 'bookmark' && <form className="bs-form" onSubmit={event => { event.preventDefault(); const data = new FormData(event.currentTarget); menuAction({ type: 'bookmark:add', title: String(data.get('title')), url: String(data.get('url')), folder: String(data.get('folder')) }) }}><label>Name<input name="title" defaultValue={active?.title ?? ''} required /></label><label>URL<input name="url" defaultValue={active?.url ?? ''} required /></label><label>Folder<input name="folder" defaultValue="Favorites" /></label><button type="submit" className="bs-primary">Save bookmark</button></form>}
      {panel === 'downloads' && <>{state.downloads.length === 0 && <Empty icon="download">Your downloads will appear here.</Empty>}{state.downloads.map(item => <div className="bs-download" key={item.id}><div className="bs-list-row"><Icon name="description" /><div className="bs-grow"><strong>{item.name}</strong><small>{item.state} · {bytes(item.received)}{item.total > 0 ? ` of ${bytes(item.total)}` : ''}</small></div></div>{item.state === 'progressing' && <progress aria-label={`${item.name} progress`} value={item.received} max={item.total || undefined} />}<div className="bs-actions">{item.state === 'progressing' && <button type="button" onClick={() => void send({ type: 'download:pause', id: item.id })}>Pause</button>}{(item.state === 'paused' || item.state === 'interrupted') && <button type="button" onClick={() => void send({ type: 'download:resume', id: item.id })}>Resume</button>}{['progressing', 'paused', 'interrupted'].includes(item.state) && <button type="button" onClick={() => void send({ type: 'download:cancel', id: item.id })}>Cancel</button>}{item.state === 'completed' && <><button type="button" onClick={() => void send({ type: 'download:open', id: item.id })}>Open file</button><button type="button" onClick={() => void send({ type: 'download:folder', id: item.id })}>Show in folder</button></>}</div></div>)}</>}
      {panel === 'extensions' && <><p>Add compatible unpacked Chromium extensions from a folder on your computer. Electron supports a subset of extension APIs; Chrome Web Store installation is unavailable.</p><button className="bs-primary" type="button" disabled={!state.capabilities.extensions} onClick={() => void send({ type: 'extensions:load' })}>Load unpacked extension</button>{state.extensions.length === 0 && <Empty icon="extension">No extensions installed.</Empty>}{state.extensions.map(item => <div className="bs-download" key={item.id}><div className="bs-list-row"><Icon name="extension" /><div className="bs-grow"><strong>{item.name}</strong><small>Version {item.version} · {item.enabled ? 'Enabled' : 'Disabled'}</small></div></div><div className="bs-actions"><button type="button" onClick={() => void send({ type: 'extension:toggle', id: item.id })}>{item.enabled ? 'Disable' : 'Enable'}</button><button type="button" onClick={() => void send({ type: 'extension:pin', id: item.id })}>{item.pinned ? 'Unpin' : 'Pin'}</button><button type="button" disabled={!item.enabled} onClick={() => menuAction({ type: 'extension:open', id: item.id })}>Open</button><button type="button" onClick={() => void send({ type: 'extension:remove', id: item.id })}>Remove</button></div></div>)}</>}
      {panel === 'settings' && <><h3>Appearance</h3><p>Quiet colors. Clear focus. Your choice.</p><div className="bs-palettes">{(['graphite', 'paper', 'system'] as const).map(value => <button type="button" key={value} aria-pressed={state.preferences.theme === value} className={`bs-palette ${value}`} onClick={() => void send({ type: 'preferences', patch: { theme: value } })}><span className="bs-palette-sample"><i /><i /><i /></span><strong>{value === 'graphite' ? 'Graphite Sage' : value === 'paper' ? 'Warm Paper' : 'Follow system'}</strong><small>{value === 'system' ? 'Automatic light & dark' : value === 'graphite' ? 'Dark · soft sage' : 'Light · warm olive'}</small></button>)}</div><h3>Browsing</h3><label className="bs-setting"><span>Search engine</span><select aria-label="Search engine" value={state.preferences.searchEngine} onChange={event => void send({ type: 'preferences', patch: { searchEngine: event.target.value as typeof state.preferences.searchEngine } })}><option value="google">Google</option><option value="duckduckgo">DuckDuckGo</option><option value="bing">Bing</option><option value="brave">Brave Search</option></select></label>{([['restoreTabs', 'Restore tabs on startup'], ['downloadAsk', 'Ask where to save downloads'], ['reduceMotion', 'Reduce motion'], ['shield', 'Block ads and trackers'], ['youtube', 'YouTube filtering']] as const).map(([key, label]) => <label className="bs-setting" key={key}><span>{label}</span><input type="checkbox" checked={state.preferences[key]} onChange={event => void send({ type: 'preferences', patch: { [key]: event.target.checked } })} /></label>)}<p className="bs-muted">YouTube filtering depends on current filter coverage and may not remove every video ad.</p><h3>Privacy and storage</h3><button type="button" onClick={() => open('clear')}>Clear browsing data</button><h3>Site permissions</h3>{state.permissions.length === 0 && <p className="bs-muted">No saved permission decisions.</p>}{state.permissions.map(item => <div className="bs-list-row" key={`${item.origin}:${item.permission}`}><div className="bs-grow"><strong>{item.origin}</strong><small>{item.permission} · {item.allowed ? 'Allowed' : 'Blocked'}</small></div><Button icon="delete" label={`Reset ${item.permission} for ${item.origin}`} onClick={() => void send({ type: 'permission:remove', origin: item.origin, permission: item.permission })} /></div>)}<p className="bs-muted">Local profile · bookmarks and settings stay on this device. Account sync and a password manager are not available.</p></>}
      {panel === 'shield' && <><div className="bs-shield-summary"><Icon name="shield" /><strong>{active?.blocked ?? 0}</strong><span>requests blocked on this page</span></div><p>{host || 'Open a website to manage its protection.'}</p><label className="bs-setting"><span>Block ads and trackers</span><input type="checkbox" checked={state.preferences.shield} onChange={event => void send({ type: 'preferences', patch: { shield: event.target.checked } })} /></label>{host && <label className="bs-setting"><span>Protection for {host}</span><input type="checkbox" checked={!state.shieldExceptions.includes(host)} onChange={event => void send({ type: 'shield:site', host, enabled: event.target.checked })} /></label>}<label className="bs-setting"><span>YouTube filtering</span><input type="checkbox" checked={state.preferences.youtube} onChange={event => void send({ type: 'preferences', patch: { youtube: event.target.checked } })} /></label><p className="bs-muted">{state.shieldReady ? 'Filter lists loaded.' : 'Filter lists are preparing.'} If a page breaks, pause protection for this site and reload. Video ad filtering is best effort.</p><button type="button" disabled={!active?.url} onClick={() => menuAction({ type: 'reload' })}>Reload page</button></>}
      {panel === 'site' && <><Icon name={active?.url.startsWith('https:') ? 'lock' : 'info'} /><h3>{host || 'New tab'}</h3><p>{active?.url.startsWith('https:') ? 'This page uses an HTTPS connection.' : active?.url ? 'This page does not use HTTPS.' : 'Site information appears after you open a page.'}</p><p className="bs-muted">A secure connection does not guarantee that a site is trustworthy.</p><button type="button" onClick={() => open('shield')}>Site protection</button><h3>Permissions</h3>{state.permissions.filter(item => hostOf(item.origin) === host).map(item => <div className="bs-setting" key={item.permission}><span>{item.permission} · {item.allowed ? 'Allowed' : 'Blocked'}</span><button type="button" onClick={() => void send({ type: 'permission:remove', origin: item.origin, permission: item.permission })}>Reset</button></div>)}<p className="bs-muted">Sites request access to camera, microphone and location when needed.</p></>}
      {panel === 'clear' && <form className="bs-form" onSubmit={event => { event.preventDefault(); const data = new FormData(event.currentTarget); menuAction({ type: 'clear-data', history: data.has('history'), cookies: data.has('cookies'), cache: data.has('cache') }) }}><p>Remove selected data from this device. Clearing cookies signs you out of websites.</p>{['history', 'cookies', 'cache'].map(key => <label className="bs-setting" key={key}><span>{key === 'history' ? 'Browsing history' : key === 'cookies' ? 'Cookies and site data' : 'Cached files'}</span><input type="checkbox" name={key} defaultChecked={key === 'history'} /></label>)}<button className="bs-primary" type="submit">Clear selected data</button></form>}
      {panel === 'spaces' && <><form className="bs-form" onSubmit={event => { event.preventDefault(); const data = new FormData(event.currentTarget); const name = String(data.get('name')).trim(); event.currentTarget.reset(); if (name) menuAction({ type: 'space:create', name }) }}><label>New space<input name="name" maxLength={40} placeholder="Research" required /></label><button type="submit" className="bs-primary">Create space</button></form>{state.spaces.map(name => <div className="bs-list-row" key={name}><Icon name="workspaces" /><div className="bs-grow"><strong>{name}</strong><small>{state.tabs.filter(tab => tab.space === name).length} tabs{name === state.activeSpace ? ' · current' : ''}</small></div><button type="button" onClick={() => void send({ type: 'space', name })} disabled={name === state.activeSpace}>Open</button><Button icon="delete" label={`Remove ${name}`} disabled={state.spaces.length <= 1} onClick={() => void send({ type: 'space:remove', name })} /></div>)}<p className="bs-muted">Removing a space moves its tabs to your first space.</p></>}
      {panel === 'tabs' && <div className="bs-menu">{active && <><button type="button" onClick={() => menuAction({ type: 'tab:duplicate', id: active.id })}><Icon name="content_copy" />Duplicate tab</button><button type="button" onClick={() => menuAction({ type: 'tab:mute', id: active.id })}><Icon name="volume_off" />{active.muted ? 'Unmute' : 'Mute'} tab</button><button type="button" onClick={() => menuAction({ type: 'tab:close', id: active.id })}><Icon name="close" />Close tab</button></>}<button type="button" onClick={() => menuAction({ type: 'tab:reopen' })}><Icon name="restore" />Reopen closed tab</button></div>}
      {panel === 'menu' && <div className="bs-menu"><button type="button" onClick={() => menuAction({ type: 'tab:new' })}><Icon name="add" />New tab<kbd>Ctrl T</kbd></button><button type="button" disabled={!state.capabilities.privateBrowsing} onClick={() => menuAction({ type: 'tab:new', private: true })}><Icon name="visibility_off" />New private tab</button>{(['history', 'bookmarks', 'downloads', 'extensions', 'tabs'] as const).map(value => <button type="button" key={value} onClick={() => open(value)}><Icon name={value === 'tabs' ? 'tab' : value === 'extensions' ? 'extension' : value === 'downloads' ? 'download' : value} />{titles[value]}</button>)}<div className="bs-menu-zoom"><span>Zoom</span><Button icon="remove" label="Zoom out" disabled={!active} onClick={() => void send({ type: 'zoom', value: Math.max(0.25, (active?.zoom ?? 1) - 0.1) })} /><button type="button" onClick={() => void send({ type: 'zoom', value: 1 })}>{Math.round((active?.zoom ?? 1) * 100)}%</button><Button icon="add" label="Zoom in" disabled={!active} onClick={() => void send({ type: 'zoom', value: Math.min(5, (active?.zoom ?? 1) + 0.1) })} /></div><button type="button" onClick={() => { setPanel(null); setFind('') }}><Icon name="search" />Find in page<kbd>Ctrl F</kbd></button>{([['print', 'print', 'Print'], ['save-page', 'save', 'Save page'], ['devtools', 'code', 'Developer tools']] as const).map(([type, icon, label]) => <button type="button" key={type} disabled={!active?.url} onClick={() => menuAction({ type })}><Icon name={icon} />{label}</button>)}<button type="button" onClick={() => open('settings')}><Icon name="settings" />Settings</button></div>}
      </>}
    </div></div></div>}
  </div>
}
