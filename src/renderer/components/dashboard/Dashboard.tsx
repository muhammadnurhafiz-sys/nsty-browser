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
  const recentItems = recentTabs.map(t => ({
    title: t.title || t.url,
    url: t.url,
    favicon: t.faviconUrl || undefined,
  }))

  const pinnedItems = pinnedPages.map(p => ({
    title: p.title || p.url,
    url: p.url,
    favicon: p.faviconUrl || undefined,
  }))

  return (
    <div className="h-full overflow-y-auto hide-scrollbar flex items-center justify-center">
      <div style={{ maxWidth: 480, width: '100%', padding: '0 24px' }}>
        {/* Greeting */}
        <p className="font-body text-sm text-center mb-6" style={{ color: 'rgba(206, 250, 5, 0.6)' }}>
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
            emptyMessage="No recent tabs"
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
              emptyMessage="No pinned pages"
              onItemClick={onNavigate}
            />
          </div>
        )}
      </div>
    </div>
  )
}
