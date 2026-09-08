export type BrowserTheme = 'system' | 'graphite' | 'paper'
export interface BrowserPreferences {
  theme: BrowserTheme
  searchEngine: 'google' | 'duckduckgo' | 'bing' | 'brave'
  restoreTabs: boolean
  shield: boolean
  youtube: boolean
  reduceMotion: boolean
  downloadAsk: boolean
  sidebarCollapsed: boolean
}
export const DEFAULT_BROWSER_PREFERENCES: BrowserPreferences = {
  theme: 'system', searchEngine: 'google', restoreTabs: true, shield: true,
  youtube: true, reduceMotion: false, downloadAsk: true, sidebarCollapsed: false,
}
export interface BrowserTab {
  id: string
  url: string
  title: string
  space: string
  private: boolean
  loading: boolean
  canGoBack: boolean
  canGoForward: boolean
  muted: boolean
  zoom: number
  error: string | null
  blocked: number
  favicon: string | null
  audible: boolean
  /** Current find-in-page result, null when no search is active. */
  find: { active: number; total: number } | null
}
export interface BrowserBookmark { id: string; title: string; url: string; folder: string }
export interface BrowserHistoryEntry { id: string; title: string; url: string; visitedAt: number }
export interface BrowserDownload {
  id: string; name: string; received: number; total: number
  state: 'progressing' | 'paused' | 'completed' | 'cancelled' | 'interrupted'
}
export interface BrowserExtension { id: string; name: string; version: string; enabled: boolean; pinned: boolean }
/** Every chrome surface that can be shown in the transparent overlay view. */
export type OverlaySurface = 'menu' | 'tabs' | 'suggestions' | 'find' | 'context' | 'site' | 'shield' | 'history' | 'bookmarks' | 'downloads' | 'extensions' | 'settings' | 'bookmark' | 'clear' | 'spaces' | 'permission' | 'auth'
export interface OverlayAnchor { x: number; y: number; width: number; height: number }
export interface Suggestion { kind: 'url' | 'search' | 'bookmark' | 'history'; title: string; url: string }
export interface OverlayPayload { tabId?: string; query?: string; rows?: Suggestion[]; highlight?: number; [key: string]: unknown }
export interface BrowserOverlay {
  surface: OverlaySurface
  /** Window-relative rect of the control that opened a popover; null for modals. */
  anchor: OverlayAnchor | null
  payload: OverlayPayload
  /** Content-area origin, so the overlay can map window coordinates to its own. */
  origin: { x: number; y: number }
}
export interface BrowserPermission { id: string; origin: string; permission: string; tabId: string }
export interface SavedPermission { origin: string; permission: string; allowed: boolean }
export interface BrowserSnapshot {
  revision: number
  tabs: BrowserTab[]
  activeTabId: string | null
  activeSpace: string
  /** User-defined workspaces; always at least one. */
  spaces: string[]
  preferences: BrowserPreferences
  bookmarks: BrowserBookmark[]
  /** Most recent entries only; use searchHistory for the full bounded list. */
  history: BrowserHistoryEntry[]
  downloads: BrowserDownload[]
  extensions: BrowserExtension[]
  pendingPermission: BrowserPermission | null
  permissions: SavedPermission[]
  shieldExceptions: string[]
  shieldReady: boolean
  capabilities: { extensions: boolean; privateBrowsing: boolean }
  /** The single chrome surface currently shown in the overlay view. */
  overlay: BrowserOverlay | null
}
/** Commands the page context menu can run against the focused page view. */
export type ContextCommand = 'inspect' | 'copy' | 'cut' | 'paste' | 'select-all' | 'copy-link' | 'copy-image' | 'save-image' | 'open-link' | 'open-link-private'
export type BrowserAction =
  | { type: 'tab:new'; url?: string; private?: boolean; background?: boolean }
  | { type: 'tab:cycle'; delta: 1 | -1 }
  | { type: 'tab:nth'; index: number }
  | { type: 'tab:select' | 'tab:close' | 'tab:duplicate' | 'tab:mute'; id: string }
  | { type: 'tab:reopen' | 'back' | 'forward' | 'reload' | 'stop' | 'print' | 'save-page' | 'devtools' }
  | { type: 'navigate'; url: string }
  | { type: 'space' | 'space:create' | 'space:remove'; name: string }
  | { type: 'zoom'; value: number }
  | { type: 'find'; text: string; forward?: boolean }
  | { type: 'overlay:open'; surface: OverlaySurface; anchor?: OverlayAnchor; payload?: Record<string, unknown> }
  | { type: 'overlay:close' }
  | { type: 'suggest'; query: string; anchor: OverlayAnchor }
  | { type: 'suggest:highlight'; index: number }
  | { type: 'suggest:accept' }
  /** Renderer-reported origin of the content area (sidebar width, toolbar height). */
  | { type: 'layout'; x: number; y: number }
  | { type: 'preferences'; patch: Partial<BrowserPreferences> }
  | { type: 'bookmark:add'; title: string; url: string; folder: string }
  | { type: 'bookmark:remove'; id: string }
  | { type: 'bookmarks:import' | 'bookmarks:export' }
  | { type: 'clear-data'; history: boolean; cookies: boolean; cache: boolean }
  | { type: 'download:pause' | 'download:resume' | 'download:cancel' | 'download:open' | 'download:folder'; id: string }
  | { type: 'extensions:load' }
  | { type: 'extension:toggle' | 'extension:pin' | 'extension:remove' | 'extension:open'; id: string }
  | { type: 'shield:site'; host: string; enabled: boolean }
  | { type: 'permission:respond'; id: string; allow: boolean; remember: boolean }
  | { type: 'permission:remove'; origin: string; permission: string }
  /** Page context-menu command; x/y are page coordinates for 'inspect'. */
  | { type: 'context'; command: ContextCommand; x?: number; y?: number; url?: string }
  /** A key combination the browser owns, forwarded from the shell or a page view. */
  | { type: 'shortcut'; key: string; ctrl: boolean; shift: boolean; alt: boolean; meta: boolean }
  /** Answer to an HTTP basic-auth prompt; omitting the username cancels it. */
  | { type: 'auth:respond'; id: string; username?: string; password?: string }
export type BrowserActionResult = { ok: true; snapshot: BrowserSnapshot } | { ok: false; error: string }
