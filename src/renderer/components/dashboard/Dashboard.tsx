import { ShieldStatusCard } from './ShieldStatusCard'
import { QuickAccessCard } from './QuickAccessCard'
import type { ShieldStats, Tab, PinnedPage } from '@shared/types'
import { createLogger } from '../../utils/logger'

const log = createLogger('Dashboard')

interface DashboardProps {
  shieldStats: ShieldStats
  totalBlocked: number
  recentTabs: Tab[]
  pinnedPages: PinnedPage[]
  onNavigate: (url: string) => void
  userName?: string
}

function getGreeting(): string {
  log.debug('greeting')
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function getGreetingSubtitle(recentCount: number, pinnedCount: number): string {
  if (recentCount === 0 && pinnedCount === 0) return 'Fresh session. Shield is watching.'
  if (recentCount === 0) return `${pinnedCount} pinned, nothing open yet.`
  return `${recentCount} recent · ${pinnedCount} pinned.`
}

export function Dashboard({ shieldStats, totalBlocked, recentTabs, pinnedPages, onNavigate, userName }: DashboardProps) {
  log.debug('render', { recent: recentTabs.length, pinned: pinnedPages.length, totalBlocked })
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

  const hasPinned = pinnedItems.length > 0

  return (
    <div className="h-full overflow-y-auto hide-scrollbar">
      <div
        style={{
          maxWidth: 1040,
          width: '100%',
          margin: '0 auto',
          padding: '56px 48px 64px',
        }}
      >
        <p
          className="font-headline text-balance"
          style={{
            color: 'var(--on-surface)',
            letterSpacing: '-0.025em',
            fontSize: '32px',
            fontWeight: 500,
            lineHeight: 1.15,
            marginBottom: 6,
          }}
        >
          {getGreeting()}{userName ? (
            <>
              , <span style={{ color: 'var(--primary-hot)' }}>{userName}</span>
            </>
          ) : ''}
        </p>
        <p
          className="font-body"
          style={{ color: 'var(--on-surface-variant)', fontSize: 13, marginBottom: 28 }}
        >
          {getGreetingSubtitle(recentItems.length, pinnedItems.length)}
        </p>

        <ShieldStatusCard stats={shieldStats} totalBlocked={totalBlocked} />

        <div
          className="mt-8 grid gap-4"
          style={{
            gridTemplateColumns: hasPinned ? 'minmax(0, 1.6fr) minmax(0, 1fr)' : '1fr',
          }}
        >
          <QuickAccessCard
            title="Recent"
            icon="schedule"
            items={recentItems}
            emptyMessage="Nothing here yet. Open a tab and it'll show up."
            onItemClick={onNavigate}
          />

          {hasPinned && (
            <QuickAccessCard
              title="Pinned"
              icon="push_pin"
              items={pinnedItems}
              emptyMessage="Pin a page from a tab's right-click menu to keep it here."
              onItemClick={onNavigate}
            />
          )}
        </div>
      </div>
    </div>
  )
}
