export interface Tab {
  id: string
  url: string
  title: string
  faviconUrl: string
  spaceId: string
  isActive: boolean
  createdAt: number
  scrollPosition: number
}

export interface PinnedPage {
  url: string
  title: string
  faviconUrl: string
  order: number
}

export interface Space {
  id: string
  name: string
  color: string
  pinnedPages: PinnedPage[]
  tabs: Tab[]
}

export interface Conversation {
  id: string
  title: string
  model: 'sonnet' | 'haiku' | 'opus'
  pageUrl: string | null
  messages: Message[]
  createdAt: number
  updatedAt: number
}

export interface Message {
  id: number
  conversationId: string
  role: 'user' | 'assistant'
  content: string
  tokensUsed: number | null
  createdAt: number
}

export interface ShieldStats {
  domain: string
  adsBlocked: number
  trackersBlocked: number
  bytesSaved: number
}

export interface TabUpdateEvent {
  tabId: string
  url?: string
  title?: string
  faviconUrl?: string
}

export interface ShieldStatsEvent {
  tabId: string
  stats: ShieldStats
}

export interface UserProfile {
  id: string
  name: string
  email: string
  avatarUrl: string | null
  provider: 'local' | 'google'
}

export type IpcChannels = {
  'tab:create': (url: string, spaceId: string) => void
  'tab:close': (tabId: string) => void
  'tab:switch': (tabId: string) => void
  'tab:navigate': (url: string) => void
  'tab:updated': (event: TabUpdateEvent) => void
  'space:switch': (spaceId: string) => void
  'shield:stats': (event: ShieldStatsEvent) => void
  'shield:toggle': (domain: string, enabled: boolean) => void
  'ai:send': (message: string, conversationId: string | null) => void
  'ai:stream': (chunk: string) => void
  'ai:context': () => string
}
