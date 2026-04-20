import type { ShieldStats } from '@shared/types'
import { ShieldPopup } from '../sidebar/ShieldPopup'

interface ShieldButtonProps {
  count: number
  stats: ShieldStats
  popupOpen: boolean
  onToggle: () => void
  onClose: () => void
  onDisableForSite: () => void
}

export function ShieldButton({ count, stats, popupOpen, onToggle, onClose, onDisableForSite }: ShieldButtonProps) {
  return (
    <div className="relative" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
      <button
        type="button"
        onClick={onToggle}
        className="w-7 h-7 rounded-md flex items-center justify-center cursor-pointer transition-colors hover-surface"
        aria-label={`Shield: ${count} blocked`}
        title={`${count} blocked`}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--outline)' }}>shield</span>
        {count > 0 && (
          <span
            className="absolute -top-1 -right-1 min-w-[14px] h-[14px] rounded-full flex items-center justify-center text-[7px] font-bold"
            style={{ background: 'var(--primary)', color: 'var(--on-primary)', padding: '0 3px' }}
          >
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>
      <ShieldPopup
        stats={stats}
        isOpen={popupOpen}
        onClose={onClose}
        onDisableForSite={onDisableForSite}
      />
    </div>
  )
}
