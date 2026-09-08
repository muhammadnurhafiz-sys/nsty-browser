import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { DEFAULT_BROWSER_PREFERENCES, type BrowserAction, type BrowserActionResult, type BrowserHistoryEntry, type BrowserSnapshot, type OverlayAnchor, type OverlaySurface } from '../shared/browser'
import { isBrowserShortcut } from '../shared/browser-policy'
import { createLogger } from './utils/logger'
import { useShellTheme } from './utils/theme'
import './browser-shell.css'

const log = createLogger('BrowserShell')
const EMPTY: BrowserSnapshot = { revision: -1, tabs: [], activeTabId: null, activeSpace: 'Work', spaces: ['Work'], preferences: DEFAULT_BROWSER_PREFERENCES, bookmarks: [], history: [], downloads: [], extensions: [], pendingPermission: null, permissions: [], shieldExceptions: [], shieldReady: false, capabilities: { extensions: false, privateBrowsing: false }, overlay: null }
interface Bridge { getBrowserSnapshot(): Promise<BrowserSnapshot>; dispatchBrowserAction(action: BrowserAction): Promise<BrowserActionResult>; onBrowserSnapshot(callback: (snapshot: BrowserSnapshot) => void): () => void; searchHistory?(query: string, limit?: number): Promise<BrowserHistoryEntry[]>; onBrowserShortcut?(callback: (key: string) => void): () => void; platform?: string }
const bridge = () => window.nsty as unknown as Bridge | undefined
// Space accent colours by position; the palette cycles past six spaces.
const SPACE_COLORS = ['#B9C99F', '#A7C8EE', '#F4A49A', '#F2D06B', '#C9B8FF', '#8FD3C7']
const SIDEBAR_WIDE = 240, SIDEBAR_RAIL = 64, TOOLBAR = 54
const ORIGIN_RECT: OverlayAnchor = { x: 0, y: 0, width: 0, height: 0 }
/** Window-relative rect of a chrome control, used to anchor an overlay popover. */
const rectOf = (element: HTMLElement | null | undefined): OverlayAnchor => {
  if (!element?.getBoundingClientRect) return ORIGIN_RECT
  const rect = element.getBoundingClientRect()
  return { x: Math.max(0, Math.round(rect.x)), y: Math.max(0, Math.round(rect.y)), width: Math.max(0, Math.round(rect.width)), height: Math.max(0, Math.round(rect.height)) }
}
const hostOf = (url: string) => { try { return new URL(url).hostname } catch { return '' } }
const bytes = (value: number) => value < 1048576 ? `${Math.round(value / 1024)} KB` : `${(value / 1048576).toFixed(1)} MB`
function Icon({ name }: { name: string }) { return <span className="bs-icon" aria-hidden="true">{name}</span> }
function Button({ icon, label, onClick, disabled = false, children }: { icon?: string; label: string; onClick: (event: React.MouseEvent<HTMLButtonElement>) => void; disabled?: boolean; children?: ReactNode }) { return <button type="button" title={label} aria-label={label} onClick={onClick} disabled={disabled}>{icon && <Icon name={icon} />}{children}</button> }

export function BrowserShell() {
  const [state, setState] = useState<BrowserSnapshot>(EMPTY)
  const [address, setAddress] = useState('')
  const [error, setError] = useState('')
  const [downloadsOpen, setDownloadsOpen] = useState(false)
  const addressRef = useRef<HTMLInputElement>(null)
  const addressFormRef = useRef<HTMLFormElement>(null)
  /** The control that opened the surface currently on screen, so its own click toggles it shut. */
  const openedBy = useRef<{ surface: OverlaySurface; element: HTMLElement } | null>(null)
  /** Set by a mousedown that closed a surface from its own button: the click must not reopen it. */
  const suppressNext = useRef(false)
  const active = state.tabs.find(tab => tab.id === state.activeTabId)
  const theme = useShellTheme(state.preferences.theme)
  const collapsed = state.preferences.sidebarCollapsed
  const spaceColor = (name: string) => SPACE_COLORS[Math.max(0, state.spaces.indexOf(name)) % SPACE_COLORS.length]!
  const liveDownload = state.downloads.find(d => d.state === 'progressing' || d.state === 'paused') ?? state.downloads[0]
  const overlay = state.overlay
  const rows = overlay?.surface === 'suggestions' ? overlay.payload.rows ?? [] : []
  const highlight = typeof overlay?.payload.highlight === 'number' ? overlay.payload.highlight : 0
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
  /** Ask main to show a chrome surface; clicking the button of an open surface closes it. */
  const open = (surface: OverlaySurface, element?: HTMLElement | null, payload?: Record<string, unknown>) => {
    if (suppressNext.current) { suppressNext.current = false; log.debug('toggle surface closed', { surface }); return }
    openedBy.current = element ? { surface, element } : null
    void send({ type: 'overlay:open', surface, ...(element ? { anchor: rectOf(element) } : {}), ...(payload ? { payload } : {}) })
  }
  const navigate = (url: string) => { void send({ type: 'navigate', url }) }
  const suggest = (query: string) => { void send({ type: 'suggest', query, anchor: rectOf(addressFormRef.current) }) }
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
  useEffect(() => { log.debug('report content rect'); void send({ type: 'layout', x: collapsed ? SIDEBAR_RAIL : SIDEBAR_WIDE, y: TOOLBAR }) }, [collapsed, send])
  const overlayRef = useRef(state.overlay); overlayRef.current = state.overlay
  useEffect(() => {
    log.debug('close an open surface when chrome is clicked')
    const down = (event: MouseEvent) => {
      const current = overlayRef.current
      if (!current || event.button !== 0) return
      const target = event.target as HTMLElement | null
      if (!target?.closest?.('.bs-toolbar, .bs-sidebar') || target.closest('.bs-address')) return
      // Clicking the very control that opened the surface toggles it shut; every
      // other chrome control closes it and then does its own job.
      const owner = openedBy.current
      if (owner && owner.surface === current.surface && owner.element.contains(target)) {
        // Cleared by the click that follows; a drag-off never clicks, so expire it too.
        suppressNext.current = true
        setTimeout(() => { suppressNext.current = false }, 400)
      }
      void send({ type: 'overlay:close' })
    }
    document.addEventListener('mousedown', down)
    return () => document.removeEventListener('mousedown', down)
  }, [send])
  useEffect(() => {
    log.debug('register browser shortcuts')
    // Main owns every browser shortcut so a page view and the chrome behave the
    // same; the shell only forwards the combinations from the shared list.
    const key = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey || event.altKey || /^F\d+$/.test(event.key))) return
      const mods = { ctrl: event.ctrlKey, shift: event.shiftKey, alt: event.altKey, meta: event.metaKey }
      if (!isBrowserShortcut(event.key, mods)) return
      event.preventDefault()
      void send({ type: 'shortcut', key: event.key, ...mods })
    }
    document.addEventListener('keydown', key)
    return () => document.removeEventListener('keydown', key)
  }, [send])
  useEffect(() => {
    const api = bridge()
    if (!api?.onBrowserShortcut) return
    log.debug('listen for the address-bar shortcut forwarded from page views')
    return api.onBrowserShortcut(key => {
      if (key !== 'l') return
      addressRef.current?.focus(); addressRef.current?.select()
    })
  }, [])
  log.debug('render browser chrome', { revision: state.revision, theme })
  return <div className="browser-shell" data-theme={theme} data-reduce-motion={state.preferences.reduceMotion} data-platform={bridge()?.platform ?? 'web'} data-collapsed={collapsed}>
    <a className="bs-skip" href="#browser-content">Skip to content</a>
    <header className="bs-toolbar">
      <div className="bs-brand"><span className="bs-logo">n.</span><strong>nsty</strong><span className="bs-beta">BROWSER</span></div>
      <div className="bs-navigation"><Button icon="arrow_back" label="Back" disabled={!active?.canGoBack} onClick={() => void send({ type: 'back' })} /><Button icon="arrow_forward" label="Forward" disabled={!active?.canGoForward} onClick={() => void send({ type: 'forward' })} /><Button icon={active?.loading ? 'close' : 'refresh'} label={active?.loading ? 'Stop loading' : 'Reload'} disabled={!active?.url} onClick={() => void send({ type: active?.loading ? 'stop' : 'reload' })} /></div>
      <form ref={addressFormRef} className="bs-address" onSubmit={event => { event.preventDefault(); navigate(address) }}>
        <Button icon={active?.private ? 'visibility_off' : 'tune'} label="Site information" onClick={event => open('site', event.currentTarget)} />
        <input ref={addressRef} aria-label="Address and search" placeholder="Search or enter a website" value={address} onChange={event => { setAddress(event.target.value); suggest(event.target.value) }} onFocus={() => suggest(address)} onKeyDown={event => { if (event.key === 'Escape') { void send({ type: 'overlay:close' }); return } if (rows.length === 0) return; if (event.key === 'ArrowDown') { event.preventDefault(); void send({ type: 'suggest:highlight', index: (highlight + 1) % rows.length }) } if (event.key === 'ArrowUp') { event.preventDefault(); void send({ type: 'suggest:highlight', index: (highlight - 1 + rows.length) % rows.length }) } if (event.key === 'Enter') { const row = rows[highlight]; if (row?.url) { event.preventDefault(); void send({ type: 'suggest:accept' }) } } }} />
        <Button icon="bookmark_add" label="Bookmark this page" disabled={!active?.url} onClick={event => open('bookmark', event.currentTarget)} />
      </form>
      {liveDownload && <div className="bs-download-pill-wrap"><button type="button" className="bs-download-pill" aria-label={`Downloads: ${liveDownload.name} ${liveDownload.state}`} aria-expanded={downloadsOpen} onClick={() => setDownloadsOpen(v => !v)}><svg viewBox="0 0 24 24" className={`bs-ring ${liveDownload.state === 'progressing' && liveDownload.total <= 0 ? 'indeterminate' : ''}`} aria-hidden="true"><circle cx="12" cy="12" r="9" className="bs-ring-track" /><circle cx="12" cy="12" r="9" className="bs-ring-fill" style={{ strokeDashoffset: 56.5 * (1 - (liveDownload.total > 0 ? Math.min(1, liveDownload.received / liveDownload.total) : liveDownload.state === 'completed' ? 1 : 0)) }} /></svg><span>{liveDownload.name}</span></button>{downloadsOpen && <><button type="button" className="bs-suggestion-backdrop" aria-label="Close downloads" onClick={() => setDownloadsOpen(false)} /><div className="bs-download-popover" role="dialog" aria-label="Downloads">{state.downloads.slice(0, 5).map(item => <div className="bs-download" key={item.id}><div className="bs-list-row"><Icon name="description" /><div className="bs-grow"><strong>{item.name}</strong><small>{item.state} · {bytes(item.received)}{item.total > 0 ? ` of ${bytes(item.total)}` : ''}</small></div></div>{item.state === 'progressing' && <progress aria-label={`${item.name} progress`} value={item.received} max={item.total || undefined} />}<div className="bs-actions">{item.state === 'progressing' && <button type="button" onClick={() => void send({ type: 'download:pause', id: item.id })}>Pause</button>}{(item.state === 'paused' || item.state === 'interrupted') && <button type="button" onClick={() => void send({ type: 'download:resume', id: item.id })}>Resume</button>}{['progressing', 'paused', 'interrupted'].includes(item.state) && <button type="button" onClick={() => void send({ type: 'download:cancel', id: item.id })}>Cancel</button>}{item.state === 'completed' && <><button type="button" onClick={() => void send({ type: 'download:open', id: item.id })}>Open</button><button type="button" onClick={() => void send({ type: 'download:folder', id: item.id })}>Folder</button></>}</div></div>)}<button className="bs-text-button" type="button" onClick={() => { setDownloadsOpen(false); open('downloads') }}>All downloads</button></div></>}</div>}
      <div className="bs-tools"><Button icon="shield" label="Open Shield" onClick={event => open('shield', event.currentTarget)} /><Button icon="extension" label="Extensions" onClick={() => open('extensions')} /><Button icon="download" label="Downloads" onClick={() => open('downloads')} /><Button icon="more_horiz" label="Browser menu" onClick={event => open('menu', event.currentTarget)} /></div>
    </header>
    <aside className="bs-sidebar" style={{ '--bs-space': spaceColor(state.activeSpace) } as React.CSSProperties}><div className="bs-space-row" role="tablist" aria-label="Spaces">{state.spaces.map(name => <button type="button" role="tab" key={name} aria-selected={name === state.activeSpace} aria-label={`${name} space`} title={name} className="bs-space-dot-btn" style={{ background: spaceColor(name) }} onClick={() => void send({ type: 'space', name })} />)}<Button icon={collapsed ? 'chevron_right' : 'chevron_left'} label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} onClick={() => void send({ type: 'preferences', patch: { sidebarCollapsed: !collapsed } })} /></div><div className="bs-workspace"><span className="bs-space-dot" style={{ background: spaceColor(state.activeSpace) }} /><select aria-label="Workspace" value={state.activeSpace} onChange={event => void send({ type: 'space', name: event.target.value })}>{Array.from(new Set([...state.spaces, state.activeSpace])).map(name => <option key={name}>{name}</option>)}</select><Button icon="workspaces" label="Manage spaces" onClick={() => open('spaces')} /></div>
      <div className="bs-sidebar-section"><span className="bs-kicker">FAVORITES</span><Button icon="bookmarks" label="Open bookmarks" onClick={() => open('bookmarks')} /></div>
      <div className="bs-favorites">{state.bookmarks.slice(0, 6).map(bookmark => <Button key={bookmark.id} label={bookmark.title} onClick={() => navigate(bookmark.url)}><span>{(bookmark.title || hostOf(bookmark.url)).slice(0, 1).toUpperCase()}</span></Button>)}{state.bookmarks.length === 0 && <p>Save your favorite pages here.</p>}</div>
      <div className="bs-sidebar-section"><span className="bs-kicker">YOUR TABS</span><span className="bs-count">{state.tabs.filter(tab => tab.space === state.activeSpace).length}</span></div>
      <div className="bs-tabs">{state.tabs.filter(tab => tab.space === state.activeSpace).map(tab => <div key={tab.id} className={`bs-tab ${tab.id === state.activeTabId ? 'selected' : ''}`} onContextMenu={event => { event.preventDefault(); open('tabs', event.currentTarget, { tabId: tab.id }) }}><Button label={`Select ${tab.title || 'New tab'}`} onClick={() => void send({ type: 'tab:select', id: tab.id })}><span className="bs-favicon-slot">{tab.loading ? <span className="bs-spinner" aria-hidden="true" /> : tab.private ? <Icon name="visibility_off" /> : tab.favicon ? <img className="bs-favicon" src={tab.favicon} alt="" /> : <Icon name="language" />}</span><span className="bs-tab-title">{tab.title || 'New tab'}</span>{tab.muted ? <Icon name="volume_off" /> : tab.audible ? <Icon name="volume_up" /> : null}</Button><Button icon="close" label={`Close ${tab.title || 'New tab'}`} onClick={() => void send({ type: 'tab:close', id: tab.id })} /></div>)}</div>
      <button className="bs-new-tab" type="button" aria-label="New tab" onClick={() => void send({ type: 'tab:new' })}><Icon name="add" />New tab<kbd>⌘ / Ctrl T</kbd></button>
      <div className="bs-sidebar-bottom"><button type="button" onClick={event => open('shield', event.currentTarget)}><Icon name="verified_user" /><span>Shield {state.preferences.shield ? 'enabled' : 'paused'}<small>{state.shieldReady ? 'Protection is ready' : 'Preparing filter lists'}</small></span><span className="bs-status-dot" /></button><div><Button icon="history" label="History" onClick={() => open('history')} /><span className="bs-profile">Local browser</span><Button icon="settings" label="Settings" onClick={() => open('settings')} /></div></div>
    </aside>
    <main id="browser-content" tabIndex={-1} className="bs-content">{(!active?.url || active.error) && <div className="bs-dashboard">{active?.error ? <><Icon name="cloud_off" /><h1>This page couldn’t load</h1><p>{active.error}</p><button className="bs-primary" type="button" onClick={() => void send({ type: 'reload' })}>Try again</button></> : <><span className="bs-eyebrow">A LITTLE LESS NOISE. A LITTLE MORE SPACE.</span><h1>Your browser.<br /><em>Your own pace.</em></h1><p>A fresh start for whatever comes next.</p><form className="bs-dashboard-search" onSubmit={event => { event.preventDefault(); const data = new FormData(event.currentTarget); navigate(String(data.get('search'))) }}><Icon name="search" /><input name="search" aria-label="Search the web" placeholder="Search the web or enter a URL" required /><button type="submit" aria-label="Search"><Icon name="arrow_forward" /></button></form><div className="bs-cards"><button type="button" onClick={() => open('bookmarks')}><Icon name="bookmarks" /><strong>Your favorites</strong><span>{state.bookmarks.length} saved pages, always close.</span></button><button type="button" onClick={() => open('history')}><Icon name="history" /><strong>Pick up where you left off</strong><span>Find a page in your browsing history.</span></button><button type="button" onClick={() => open('shield')}><Icon name="shield" /><strong>A quieter web</strong><span>Manage protection for each site.</span></button></div><span className="bs-dashboard-footer">{active?.private ? 'Private tab · activity is not saved to history' : `${theme === 'graphite' ? 'Graphite Sage' : 'Warm Paper'} · Made for your everyday`}</span></>}</div>}</main>
    {error && <div className="bs-toast" role="alert"><span>{error}</span><Button icon="close" label="Dismiss error" onClick={() => setError('')} /></div>}
  </div>
}
