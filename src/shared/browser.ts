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
}
export type BrowserAction =
  | { type: 'tab:new'; url?: string; private?: boolean }
  | { type: 'tab:select' | 'tab:close' | 'tab:duplicate' | 'tab:mute'; id: string }
  | { type: 'tab:reopen' | 'back' | 'forward' | 'reload' | 'stop' | 'print' | 'save-page' | 'devtools' }
  | { type: 'navigate'; url: string }
  | { type: 'space' | 'space:create' | 'space:remove'; name: string }
  | { type: 'zoom'; value: number }
  | { type: 'find'; text: string; forward?: boolean }
  | { type: 'overlay'; open: boolean }
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
export type BrowserActionResult = { ok: true; snapshot: BrowserSnapshot } | { ok: false; error: string }
