import { ShieldPopup } from './ShieldPopup'
import type { ShieldStats } from '@shared/types'

interface NavControlsProps {
  onBack: () => void
  onForward: () => void
  onReload: () => void
  onOpenHistory: () => void
  shieldCount: number
  shieldStats: ShieldStats
  shieldPopupOpen: boolean
  onToggleShieldPopup: () => void
  onCloseShieldPopup: () => void
  onDisableShieldForSite: () => void
  isExpanded: boolean
}

export function NavControls({
  onBack,
  onForward,
  onReload,
  onOpenHistory,
  shieldCount,
  shieldStats,
  shieldPopupOpen,
  onToggleShieldPopup,
  onCloseShieldPopup,
  onDisableShieldForSite,
  isExpanded,
}: NavControlsProps) {
  return (
    <div className={`flex items-center gap-1 ${isExpanded ? 'px-3' : 'flex-col px-0'}`} style={{ padding: isExpanded ? undefined : '0 8px' }}>
      <NavButton icon="arrow_back" label="Back" onClick={onBack} />
      <NavButton icon="arrow_forward" label="Forward" onClick={onForward} />
      <NavButton icon="refresh" label="Reload" onClick={onReload} />
      <NavButton icon="history" label="History" onClick={onOpenHistory} />
      {isExpanded && <div className="flex-1" />}
      <div className="relative">
        <button
          onClick={onToggleShieldPopup}
          className="w-6 h-6 rounded-md flex items-center justify-center cursor-pointer transition-colors"
          style={{ background: 'transparent' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-translucent-hover)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
          aria-label={`Shield: ${shieldCount} blocked`}
          title={`${shieldCount} blocked`}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'var(--outline)' }}>shield</span>
          {shieldCount > 0 && (
            <span
              className="absolute -top-1 -right-1 min-w-[14px] h-[14px] rounded-full flex items-center justify-center text-[7px] font-bold"
              style={{ background: 'var(--primary)', color: 'var(--on-primary)', padding: '0 3px' }}
            >
              {shieldCount > 99 ? '99+' : shieldCount}
            </span>
          )}
        </button>
        <ShieldPopup
          stats={shieldStats}
          isOpen={shieldPopupOpen}
          onClose={onCloseShieldPopup}
          onDisableForSite={onDisableShieldForSite}
        />
      </div>
    </div>
  )
}

function NavButton({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-6 h-6 rounded-md flex items-center justify-center cursor-pointer transition-colors"
      style={{ background: 'transparent' }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-translucent-hover)' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
      aria-label={label}
      title={label}
    >
      <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'var(--outline)' }}>{icon}</span>
    </button>
  )
}
