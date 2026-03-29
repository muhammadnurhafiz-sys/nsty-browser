import { useState, useCallback } from 'react'
import { ShieldStatusCard } from './ShieldStatusCard'
import { QuickAccessCard } from './QuickAccessCard'
import { FeatureCard } from './FeatureCard'
import type { ShieldStats, Tab, PinnedPage } from '@shared/types'

interface DashboardProps {
  shieldStats: ShieldStats
  totalBlocked: number
  recentTabs: Tab[]
  pinnedPages: PinnedPage[]
  onNavigate: (url: string) => void
  onSearch: (query: string) => void
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export function Dashboard({ shieldStats, totalBlocked, recentTabs, pinnedPages, onNavigate, onSearch }: DashboardProps) {
  const [searchValue, setSearchValue] = useState('')

  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const value = searchValue.trim()
      if (value) {
        onSearch(value)
        setSearchValue('')
      }
    }
  }, [searchValue, onSearch])

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
    <div className="h-full overflow-y-auto hide-scrollbar">
      <div className="max-w-3xl mx-auto px-8 py-12">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-display text-2xl mb-1" style={{ color: 'var(--primary)' }}>
            Nsty
          </h1>
          <p className="font-body text-base" style={{ color: 'var(--on-surface-variant)' }}>
            {getGreeting()}
          </p>
        </div>

        {/* Search bar */}
        <div
          className="glass-panel flex items-center gap-3 px-5 mb-8"
          style={{ height: 48, borderRadius: 'var(--radius-full)' }}
        >
          <span className="material-symbols-outlined text-[20px]" style={{ color: 'var(--outline)' }}>
            search
          </span>
          <input
            type="text"
            placeholder="Search or enter URL..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className="flex-1 bg-transparent outline-none font-body text-sm"
            style={{ color: 'var(--on-surface)' }}
          />
        </div>

        {/* Card grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Shield Status — full width */}
          <ShieldStatusCard stats={shieldStats} totalBlocked={totalBlocked} />

          {/* Quick Access — side by side */}
          <QuickAccessCard
            title="Recent Tabs"
            icon="schedule"
            items={recentItems}
            emptyMessage="No recent tabs"
            animationClass="card-fade-up-2"
            onItemClick={onNavigate}
          />
          <QuickAccessCard
            title="Pinned Pages"
            icon="push_pin"
            items={pinnedItems}
            emptyMessage="No pinned pages"
            animationClass="card-fade-up-3"
            onItemClick={onNavigate}
          />

          {/* Feature Card — full width */}
          <FeatureCard animationClass="card-fade-up-4" />
        </div>
      </div>
    </div>
  )
}
