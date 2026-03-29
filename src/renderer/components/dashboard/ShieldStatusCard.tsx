import { HexIcon } from './HexIcon'
import type { ShieldStats } from '@shared/types'

interface ShieldStatusCardProps {
  stats: ShieldStats
  totalBlocked: number
}

export function ShieldStatusCard({ stats, totalBlocked }: ShieldStatusCardProps) {
  const effectiveness = totalBlocked > 0 ? Math.min(Math.round((totalBlocked / (totalBlocked + 20)) * 100), 99) : 0

  return (
    <div className="card-base card-fade-up card-fade-up-1 p-5 col-span-full" style={{ opacity: 0 }}>
      {/* Header row */}
      <div className="flex items-center gap-3 mb-4">
        <HexIcon size={32} />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-card-title" style={{ color: 'var(--on-surface)' }}>
              Nsty Shield
            </span>
            <span className="badge-active" aria-label="Shield status: Active">
              <span className="material-symbols-outlined text-[10px] mr-0.5" aria-hidden="true" style={{ color: 'inherit' }}>check_circle</span>
              Active
            </span>
          </div>
          <span className="text-card-label">v0.3.0 — Privacy Engine</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex justify-between mb-1.5">
          <span className="text-card-label">Blocking Effectiveness</span>
          <span className="font-label text-xs font-bold" style={{ color: 'var(--primary)' }}>
            {effectiveness}%
          </span>
        </div>
        <div className="progress-bar">
          <div className="progress-bar-fill" style={{ width: `${effectiveness}%` }} />
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <p className="font-headline text-lg font-bold" style={{ color: 'var(--on-surface)' }}>
            {stats.adsBlocked.toLocaleString()}
          </p>
          <p className="text-card-label">Ads Blocked</p>
        </div>
        <div>
          <p className="font-headline text-lg font-bold" style={{ color: 'var(--on-surface)' }}>
            {stats.trackersBlocked.toLocaleString()}
          </p>
          <p className="text-card-label">Trackers Blocked</p>
        </div>
        <div>
          <p className="font-headline text-lg font-bold" style={{ color: 'var(--on-surface)' }}>
            {formatBytes(stats.bytesSaved)}
          </p>
          <p className="text-card-label">Data Saved</p>
        </div>
      </div>
    </div>
  )
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`
}
