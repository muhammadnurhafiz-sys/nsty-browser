import type { ShieldStats } from '@shared/types'

interface ShieldPopupProps {
  stats: ShieldStats
  isOpen: boolean
  onClose: () => void
  onDisableForSite: () => void
}

export function ShieldPopup({ stats, isOpen, onClose, onDisableForSite }: ShieldPopupProps) {
  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Popup */}
      <div
        className="absolute right-12 top-10 z-50 w-56 rounded-xl p-3.5 shadow-2xl"
        style={{
          background: 'var(--bg-sidebar)',
          border: '1px solid var(--border)',
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">🛡️</span>
          <div>
            <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Nsty Shield
            </div>
            <div className="text-[10px]" style={{ color: 'var(--green)' }}>
              Active on this page
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="flex flex-col">
          <StatRow label="Ads blocked" value={stats.adsBlocked} />
          <StatRow label="Trackers blocked" value={stats.trackersBlocked} />
          <StatRow label="Data saved" value={formatBytes(stats.bytesSaved)} />
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-3">
          <button
            onClick={onDisableForSite}
            className="flex-1 py-1.5 text-center rounded-md text-[10px] cursor-pointer hover:brightness-125"
            style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}
          >
            Disable for site
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-1.5 text-center rounded-md text-[10px] cursor-pointer hover:brightness-125"
            style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}
          >
            Close
          </button>
        </div>
      </div>
    </>
  )
}

function StatRow({ label, value }: { label: string; value: number | string }) {
  return (
    <div
      className="flex justify-between py-2"
      style={{ borderTop: '1px solid var(--border)' }}
    >
      <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <span className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>
        {value}
      </span>
    </div>
  )
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}
