import { ShieldStatusCard } from './ShieldStatusCard'
import { QuickAccessCard } from './QuickAccessCard'
import type { ShieldStats, Tab, PinnedPage } from '@shared/types'

interface DashboardProps {
  shieldStats: ShieldStats
  totalBlocked: number
  recentTabs: Tab[]
  pinnedPages: PinnedPage[]
  onNavigate: (url: string) => void
  userName?: string
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export function Dashboard({ shieldStats, totalBlocked, recentTabs, pinnedPages, onNavigate, userName }: DashboardProps) {
  const recentItems = recentTabs.map(t => {
    const item: { title: string; url: string; favicon?: string } = {
      title: t.title || t.url,
      url: t.url,
    }
    if (t.faviconUrl) item.favicon = t.faviconUrl
    return item
  })

  const pinnedItems = pinnedPages.map(p => {
    const item: { title: string; url: string; favicon?: string } = {
      title: p.title || p.url,
      url: p.url,
    }
    if (p.faviconUrl) item.favicon = p.faviconUrl
    return item
  })

  return (
    <div className="h-full overflow-y-auto hide-scrollbar flex items-center justify-center">
      <div style={{ maxWidth: 480, width: '100%', padding: '0 24px' }}>
        {/* Greeting — hero line, accessible muted primary, balanced wrap */}
        <p
          className="font-headline text-lg text-center mb-6 text-balance"
          style={{ color: 'var(--primary-muted-accessible)', letterSpacing: '-0.01em' }}
        >
          {getGreeting()}{userName ? `, ${userName}` : ''}
        </p>

        {/* Shield Stats — 2-column grid */}
        <ShieldStatusCard stats={shieldStats} totalBlocked={totalBlocked} />

        {/* Recent Tabs */}
        <div className="mt-3">
          <QuickAccessCard
            title="Recent"
            icon="schedule"
            items={recentItems}
            emptyMessage="Nothing here yet. Open a tab and it'll show up."
            onItemClick={onNavigate}
          />
        </div>

        {/* Pinned Pages */}
        {pinnedItems.length > 0 && (
          <div className="mt-3">
            <QuickAccessCard
              title="Pinned"
              icon="push_pin"
              items={pinnedItems}
              emptyMessage="Pin a page from a tab's right-click menu to keep it here."
              onItemClick={onNavigate}
            />
          </div>
        )}
      </div>
    </div>
  )
}
