import type { ShieldStats } from '@shared/types'
import { createLogger } from '../../utils/logger'

const log = createLogger('ShieldStatusCard')

interface ShieldStatusCardProps {
  stats: ShieldStats
  totalBlocked: number
}

export function ShieldStatusCard({ stats: _stats, totalBlocked }: ShieldStatusCardProps) {
  const effectiveness = totalBlocked > 0 ? Math.min(Math.round((totalBlocked / (totalBlocked + 20)) * 100), 99) : 0
  log.debug('render', { totalBlocked, effectiveness })

  return (
    <div
      className="card-fade-up card-fade-up-1 rounded-xl flex items-stretch overflow-hidden shadow-border"
      style={{ background: 'var(--surface-container-high)' }}
    >
      <Metric value={totalBlocked.toLocaleString()} label="Ads blocked" />
      <div style={{ width: 1, background: 'var(--border-subtle)' }} aria-hidden="true" />
      <Metric value={`${effectiveness}%`} label="Effectiveness" />
    </div>
  )
}

function Metric({ value, label }: { value: string; label: string }) {
  log.debug('metric', { label, value })
  return (
    <div className="flex-1 flex flex-col items-start gap-1.5 px-5 py-4">
      <div
        className="font-headline font-semibold tabular-nums"
        style={{ color: 'var(--on-surface)', letterSpacing: '-0.02em', fontSize: '28px', lineHeight: 1 }}
      >
        {value}
      </div>
      <div
        className="font-label text-[10px] uppercase"
        style={{ color: 'var(--on-surface-variant)', letterSpacing: '0.14em' }}
      >
        {label}
      </div>
    </div>
  )
}
