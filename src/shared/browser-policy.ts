import type { BrowserAction, BrowserPreferences, ContextCommand, OverlaySurface, Suggestion } from './browser'

const SEARCH_BASE: Record<BrowserPreferences['searchEngine'], string> = {
  google: 'https://www.google.com/search?q=', duckduckgo: 'https://duckduckgo.com/?q=',
  bing: 'https://www.bing.com/search?q=', brave: 'https://search.brave.com/search?q=',
}
const ENGINE_NAMES: Record<BrowserPreferences['searchEngine'], string> = { google: 'Google', duckduckgo: 'DuckDuckGo', bing: 'Bing', brave: 'Brave Search' }
export const OVERLAY_SURFACES: OverlaySurface[] = ['menu', 'tabs', 'suggestions', 'find', 'context', 'site', 'shield', 'history', 'bookmarks', 'downloads', 'extensions', 'settings', 'bookmark', 'clear', 'spaces', 'permission', 'auth']

/** True when the text should be treated as an address rather than a search term. */
export function isUrlLike(input: string): boolean {
  const text = input.trim()
  if (!text || /\s/.test(text)) return /^https?:\/\//i.test(text)
  return /^https?:\/\//i.test(text) || /^(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(text) || /^[^/:]+\.[^/:]+(:\d+)?(\/|$)/.test(text)
}
/** Search URL for free text, using the same engine table as normalizeAddress. */
export function searchUrl(text: string, engine: BrowserPreferences['searchEngine'] = 'google'): string {
  return SEARCH_BASE[engine] + encodeURIComponent(text.trim())
}
/**
 * Omnibox rows for a query: address row first when the text looks like a URL,
 * then the search row, then matching bookmarks and history, deduped by URL.
 */
export function buildSuggestions(query: string, engine: BrowserPreferences['searchEngine'], bookmarks: { title: string; url: string }[], history: { title: string; url: string }[]): Suggestion[] {
  console.debug('[browser-policy] Build omnibox suggestions')
  const text = query.trim()
  if (!text) return [{ kind: 'search', title: 'Type a website or search', url: '' }]
  const rows: Suggestion[] = []
  if (isUrlLike(text)) {
    try { rows.push({ kind: 'url', title: `Go to ${text}`, url: normalizeAddress(text, engine) }) }
    catch { console.debug('[browser-policy] URL-like input is not navigable') }
  }
  rows.push({ kind: 'search', title: `Search ${ENGINE_NAMES[engine]} for \u201c${text}\u201d`, url: searchUrl(text, engine) })
  const needle = text.toLowerCase()
  for (const item of bookmarks.filter(b => `${b.title} ${b.url}`.toLowerCase().includes(needle)).slice(0, 3)) rows.push({ kind: 'bookmark', title: item.title || item.url, url: item.url })
  for (const item of history.slice(0, 6)) rows.push({ kind: 'history', title: item.title || item.url, url: item.url })
  const seen = new Set<string>()
  return rows.filter(row => !row.url || !seen.has(row.url) && Boolean(seen.add(row.url))).slice(0, 9)
}

export function normalizeAddress(input: string, engine: BrowserPreferences['searchEngine'] = 'google'): string {
  console.debug('[browser-policy] Resolve navigation input')
  const text = input.trim()
  if (!text || text === 'nsty://newtab') return 'nsty://newtab'
  if (text.length > 8192) throw new Error('Address is too long')
  const local = /^(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(text)
  const host = !/\s/.test(text) && /^[^/:]+\.[^/:]+(:\d+)?(\/|$)/.test(text)
  if (/^https?:\/\//i.test(text) || local || host) {
    const url = new URL(/^https?:/i.test(text) ? text : `${local ? 'http' : 'https'}://${text}`)
    if (url.username || url.password) throw new Error('Addresses containing credentials are not supported')
    return url.toString()
  }
  if (/^[a-z][a-z\d+.-]*:/i.test(text)) throw new Error('Only web addresses can be opened')
  return searchUrl(text, engine)
}
export function isShellUrl(value: string, dev = false): boolean {
  try {
    const url = new URL(value)
    return (url.protocol === 'app:' && url.hostname === 'bundle' && url.pathname === '/index.html') ||
      (dev && url.origin === 'http://localhost:5173')
  } catch { return false }
}
export const CONTEXT_COMMANDS: ContextCommand[] = ['inspect', 'copy', 'cut', 'paste', 'select-all', 'copy-link', 'copy-image', 'save-image', 'open-link', 'open-link-private']
/** Schemes handed to the operating system instead of being blocked outright. */
export function isExternalProtocol(value: string): boolean {
  try { return ['mailto:', 'tel:', 'sms:'].includes(new URL(value).protocol) }
  catch { return false }
}
export interface ShortcutModifiers { ctrl: boolean; shift: boolean; alt: boolean; meta: boolean }
const MOD_KEYS = ['l', 'f', 'h', 'j', 'd', 'p', 't', 'w', 'r', '=', '+', '-', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'Tab', 'PageDown', 'PageUp']
const MOD_SHIFT_KEYS = ['t', 'r', 'n', 'i', 'Tab', 'PageUp']
/**
 * The single list of key combinations the browser handles itself. The shell
 * consults it before forwarding a key to main, and main consults it before
 * acting, so the set of owned shortcuts is defined exactly once.
 */
export function isBrowserShortcut(key: string, mods: ShortcutModifiers): boolean {
  const mod = mods.ctrl || mods.meta
  const name = key.length === 1 ? key.toLowerCase() : key
  if (mods.alt) return !mod && (name === 'ArrowLeft' || name === 'ArrowRight')
  if (['F5', 'F11', 'F12'].includes(name)) return true
  if (!mod) return name === 'Escape' && !mods.shift
  return (mods.shift ? MOD_SHIFT_KEYS : MOD_KEYS).includes(name)
}
export const MAX_SPACES = 20
export function isSpaceName(value: string): boolean {
  return /^[\p{L}\p{N}](?:[\p{L}\p{N} _.'-]{0,38}[\p{L}\p{N}._'-])?$/u.test(value)
}
export function persistableTabs(tabs: { url: string; space: string; private: boolean }[]): { url: string; space: string }[] {
  console.debug('[browser-policy] Serialize non-private session')
  return tabs.filter(tab => !tab.private).map(({ url, space }) => ({ url, space }))
}
function isAnchor(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const rect = value as Record<string, unknown>
  return ['x', 'y', 'width', 'height'].every(key => typeof rect[key] === 'number' && Number.isFinite(rect[key]) && (rect[key] as number) >= 0 && (rect[key] as number) <= 10000)
}
/** Overlay payloads cross the IPC boundary: flat primitives only, bounded in size. */
function isOverlayPayload(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const entries = Object.entries(value as Record<string, unknown>)
  if (entries.length > 20) return false
  return entries.every(([, item]) => typeof item === 'number' && Number.isFinite(item) || typeof item === 'boolean' || typeof item === 'string' && item.length <= 8192)
}
export function validateBrowserAction(value: unknown): value is BrowserAction {
  console.debug('[browser-policy] Validate command')
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const a = value as Record<string, unknown>
  const str = (key: string, max = 8192) => typeof a[key] === 'string' && (a[key] as string).length <= max
  const bool = (key: string) => typeof a[key] === 'boolean'
  const id = () => str('id', 100) && /^[\w-]+$/.test(a.id as string)
  switch (a.type) {
    case 'tab:new': return (a.url === undefined || str('url')) && (a.private === undefined || bool('private')) && (a.background === undefined || bool('background'))
    case 'tab:cycle': return a.delta === 1 || a.delta === -1
    case 'tab:nth': return typeof a.index === 'number' && Number.isFinite(a.index) && a.index >= 0 && a.index <= 99
    case 'context': return CONTEXT_COMMANDS.includes(a.command as ContextCommand) && ['x', 'y'].every(key => a[key] === undefined || typeof a[key] === 'number' && Number.isFinite(a[key]) && (a[key] as number) >= 0 && (a[key] as number) <= 10000) && (a.url === undefined || str('url'))
    case 'shortcut': return str('key', 20) && ['ctrl', 'shift', 'alt', 'meta'].every(bool)
    case 'auth:respond': return id() && (a.username === undefined || str('username', 1024)) && (a.password === undefined || str('password', 1024))
    case 'tab:select': case 'tab:close': case 'tab:duplicate': case 'tab:mute':
    case 'bookmark:remove': case 'download:pause': case 'download:resume': case 'download:cancel':
    case 'download:open': case 'download:folder': case 'extension:toggle': case 'extension:pin':
    case 'extension:remove': case 'extension:open': return id()
    case 'tab:reopen': case 'back': case 'forward': case 'reload': case 'stop': case 'print': case 'save-page':
    case 'devtools': case 'bookmarks:import': case 'bookmarks:export': case 'extensions:load': return true
    case 'navigate': return str('url')
    case 'space': case 'space:create': case 'space:remove': return str('name', 40) && isSpaceName(a.name as string)
    case 'zoom': return typeof a.value === 'number' && Number.isFinite(a.value) && a.value >= 0.5 && a.value <= 2
    case 'find': return str('text', 200) && (a.forward === undefined || bool('forward'))
    case 'overlay:open': return OVERLAY_SURFACES.includes(a.surface as OverlaySurface) && (a.anchor === undefined || isAnchor(a.anchor)) && (a.payload === undefined || isOverlayPayload(a.payload))
    case 'overlay:close': case 'suggest:accept': return true
    case 'suggest': return str('query') && isAnchor(a.anchor)
    case 'suggest:highlight': return typeof a.index === 'number' && Number.isFinite(a.index) && a.index >= 0 && a.index <= 1000
    case 'layout': return [a.x, a.y].every(v => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 2000)
    case 'bookmark:add': return str('title', 250) && str('url') && str('folder', 100)
    case 'clear-data': return bool('history') && bool('cookies') && bool('cache')
    case 'shield:site': return str('host', 255) && /^[a-z\d.-]+$/i.test(a.host as string) && bool('enabled')
    case 'permission:respond': return id() && bool('allow') && bool('remember')
    case 'permission:remove': return str('origin', 2048) && str('permission', 100)
    case 'preferences': {
      if (!a.patch || typeof a.patch !== 'object' || Array.isArray(a.patch)) return false
      return Object.entries(a.patch).every(([key, v]) => {
        if (key === 'theme') return ['system', 'graphite', 'paper'].includes(String(v))
        if (key === 'searchEngine') return ['google', 'duckduckgo', 'bing', 'brave'].includes(String(v))
        return ['restoreTabs', 'shield', 'youtube', 'reduceMotion', 'downloadAsk', 'sidebarCollapsed'].includes(key) && typeof v === 'boolean'
      })
    }
    default: return false
  }
}
