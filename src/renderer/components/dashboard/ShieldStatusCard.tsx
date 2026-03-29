import type { ShieldStats } from '@shared/types'

interface ShieldStatusCardProps {
  stats: ShieldStats
  totalBlocked: number
}

export function ShieldStatusCard({ stats, totalBlocked }: ShieldStatusCardProps) {
  const effectiveness = totalBlocked > 0 ? Math.min(Math.round((totalBlocked / (totalBlocked + 20)) * 100), 99) : 0

  return (
    <div className="grid grid-cols-2 gap-3">
      <StatCard value={totalBlocked.toLocaleString()} label="Ads Blocked" />
      <StatCard value={`${effectiveness}%`} label="Effectiveness" />
    </div>
  )
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div
      className="rounded-xl p-4 card-fade-up card-fade-up-1"
      style={{
        background: 'rgba(206, 250, 5, 0.04)',
        border: '1px solid rgba(206, 250, 5, 0.1)',
        opacity: 0,
      }}
    >
      <div className="font-headline text-2xl font-semibold" style={{ color: 'var(--primary)' }}>
        {value}
      </div>
      <div className="font-body text-[10px] mt-1" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>
        {label}
      </div>
    </div>
  )
}
