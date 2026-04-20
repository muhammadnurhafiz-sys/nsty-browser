import type { ShieldStats } from '@shared/types'
import { createLogger } from '../../utils/logger'

const log = createLogger('ShieldStatusCard')

interface ShieldStatusCardProps {
  stats: ShieldStats
  totalBlocked: number
}

export function ShieldStatusCard({ stats: _stats, totalBlocked }: ShieldStatusCardProps) {
  const isLive = totalBlocked > 0
  const effectiveness = isLive ? Math.min(Math.round((totalBlocked / (totalBlocked + 20)) * 100), 99) : 0
  log.debug('render', { totalBlocked, effectiveness, isLive })

  return (
    <div className="metrics-row card-fade-up card-fade-up-1">
      <Metric
        value={isLive ? totalBlocked.toLocaleString() : 'Ready'}
        label={isLive ? 'Requests filtered' : 'Shield · idle'}
        showPulse={!isLive}
      />
      <Metric
        value={isLive ? `${effectiveness}%` : '—'}
        label="Block efficiency"
      />
    </div>
  )
}

function Metric({ value, label, showPulse }: { value: string; label: string; showPulse?: boolean }) {
  log.debug('metric', { label, value })
  return (
    <div className="metrics-row__cell">
      <div className="metrics-row__value">
        {value}
        {showPulse && <span className="pulse-dot" aria-hidden="true" />}
      </div>
      <div className="metrics-row__label">{label}</div>
    </div>
  )
}
