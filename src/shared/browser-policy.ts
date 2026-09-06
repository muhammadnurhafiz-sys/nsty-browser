import type { BrowserAction, BrowserPreferences } from './browser'

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
  const base = { google: 'https://www.google.com/search?q=', duckduckgo: 'https://duckduckgo.com/?q=', bing: 'https://www.bing.com/search?q=', brave: 'https://search.brave.com/search?q=' }[engine]
  return base + encodeURIComponent(text)
}
export function isShellUrl(value: string, dev = false): boolean {
  try {
    const url = new URL(value)
    return (url.protocol === 'app:' && url.hostname === 'bundle' && url.pathname === '/index.html') ||
      (dev && url.origin === 'http://localhost:5173')
  } catch { return false }
}
export const MAX_SPACES = 20
export function isSpaceName(value: string): boolean {
  return /^[\p{L}\p{N}](?:[\p{L}\p{N} _.'-]{0,38}[\p{L}\p{N}._'-])?$/u.test(value)
}
export function persistableTabs(tabs: { url: string; space: string; private: boolean }[]): { url: string; space: string }[] {
  console.debug('[browser-policy] Serialize non-private session')
  return tabs.filter(tab => !tab.private).map(({ url, space }) => ({ url, space }))
}
export function validateBrowserAction(value: unknown): value is BrowserAction {
  console.debug('[browser-policy] Validate command')
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const a = value as Record<string, unknown>
  const str = (key: string, max = 8192) => typeof a[key] === 'string' && (a[key] as string).length <= max
  const bool = (key: string) => typeof a[key] === 'boolean'
  const id = () => str('id', 100) && /^[\w-]+$/.test(a.id as string)
  switch (a.type) {
    case 'tab:new': return (a.url === undefined || str('url')) && (a.private === undefined || bool('private'))
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
    case 'overlay': return bool('open')
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
        return ['restoreTabs', 'shield', 'youtube', 'reduceMotion', 'downloadAsk'].includes(key) && typeof v === 'boolean'
      })
    }
    default: return false
  }
}
