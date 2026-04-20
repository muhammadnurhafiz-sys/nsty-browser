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
    <div className="h-full overflow-y-auto hide-scrollbar">
      <div style={{ maxWidth: 640, width: '100%', margin: '0 auto', padding: '64px 32px 48px' }}>
        {/* Greeting — hero line. Left-aligned (taste anti-center bias) and at
            the top of the scroll region so "start here" is visually obvious. */}
        <p
          className="font-headline text-2xl mb-10 text-balance"
          style={{ color: 'var(--on-surface)', letterSpacing: '-0.02em' }}
        >
          {getGreeting()}{userName ? `, ${userName}` : ''}
        </p>

        <ShieldStatusCard stats={shieldStats} totalBlocked={totalBlocked} />

        <div className="mt-6">
          <QuickAccessCard
            title="Recent"
            icon="schedule"
            items={recentItems}
            emptyMessage="Nothing here yet. Open a tab and it'll show up."
            onItemClick={onNavigate}
          />
        </div>

        {pinnedItems.length > 0 && (
          <div className="mt-4">
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
