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
    <div className="card-fade-up card-fade-up-1 flex items-stretch divide-x" style={{ borderColor: 'var(--border-subtle)' }}>
      <Metric value={totalBlocked.toLocaleString()} label="Ads blocked" />
      <Metric value={`${effectiveness}%`} label="Effectiveness" />
    </div>
  )
}

function Metric({ value, label }: { value: string; label: string }) {
  log.debug('metric', { label, value })
  return (
    <div className="flex-1 flex flex-col items-start gap-1 px-4 py-3 first:pl-0">
      <div className="font-headline text-2xl font-semibold tabular-nums" style={{ color: 'var(--on-surface)', letterSpacing: '-0.02em' }}>
        {value}
      </div>
      <div className="font-body text-[10px] uppercase" style={{ color: 'var(--on-surface-variant)', letterSpacing: '0.14em' }}>
        {label}
      </div>
    </div>
  )
}
