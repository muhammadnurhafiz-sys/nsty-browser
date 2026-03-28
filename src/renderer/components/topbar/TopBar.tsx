import { AddressBar } from './AddressBar'
import { ShieldPopup } from './ShieldPopup'
import type { ShieldStats, Space } from '@shared/types'

interface TopBarProps {
  url: string
  onNavigate: (url: string) => void
  onBack: () => void
  onForward: () => void
  onReload: () => void
  shieldCount: number
  shieldStats: ShieldStats
  shieldPopupOpen: boolean
  onToggleShieldPopup: () => void
  onCloseShieldPopup: () => void
  onDisableShieldForSite: () => void
  onToggleAi: () => void
  spaces: Space[]
  activeSpaceId: string
  onSwitchSpace: (spaceId: string) => void
}

export function TopBar({
  url,
  onNavigate,
  onBack,
  onForward,
  onReload,
  shieldCount,
  shieldStats,
  shieldPopupOpen,
  onToggleShieldPopup,
  onCloseShieldPopup,
  onDisableShieldForSite,
  onToggleAi,
  spaces,
  activeSpaceId,
  onSwitchSpace,
}: TopBarProps) {
  return (
    <div
      className="flex items-center justify-center px-4"
      style={{
        height: 'var(--topbar-height)',
        background: 'var(--surface)',
        WebkitAppRegion: 'drag',
      } as React.CSSProperties}
    >
      {/* Floating glass command bar */}
      <div
        className="glass-panel flex items-center justify-between px-5 w-full max-w-4xl"
        style={{
          height: 40,
          borderRadius: 'var(--radius-full)',
          WebkitAppRegion: 'no-drag',
        } as React.CSSProperties}
      >
        {/* Left: Nav buttons + Address */}
        <div className="flex items-center gap-3 flex-1">
          {/* Nav buttons */}
          <div className="flex gap-0.5">
            <button
              onClick={onBack}
              className="w-7 h-7 rounded-full flex items-center justify-center cursor-pointer hover:bg-white/10 transition-colors"
              style={{ color: 'var(--outline)' }}
              title="Back"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            </button>
            <button
              onClick={onForward}
              className="w-7 h-7 rounded-full flex items-center justify-center cursor-pointer hover:bg-white/10 transition-colors"
              style={{ color: 'var(--outline)' }}
              title="Forward"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
            <button
              onClick={onReload}
              className="w-7 h-7 rounded-full flex items-center justify-center cursor-pointer hover:bg-white/10 transition-colors"
              style={{ color: 'var(--outline)' }}
              title="Reload"
            >
              <span className="material-symbols-outlined text-[16px]">refresh</span>
            </button>
          </div>

          {/* Address bar */}
          <AddressBar url={url} onNavigate={onNavigate} />
        </div>

        {/* Center: Space tabs */}
        <nav className="flex items-center gap-5 mx-4">
          {spaces.map((space) => {
            const isActive = space.id === activeSpaceId
            return (
              <button
                key={space.id}
                onClick={() => onSwitchSpace(space.id)}
                className="font-body text-sm cursor-pointer transition-colors whitespace-nowrap"
                style={{
                  color: isActive ? 'var(--primary)' : 'var(--outline)',
                  fontWeight: isActive ? 700 : 400,
                  borderBottom: isActive ? '1px solid var(--primary)' : '1px solid transparent',
                  paddingBottom: 2,
                }}
              >
                {space.name}
              </button>
            )
          })}
        </nav>

        {/* Right: Shield + AI + actions */}
        <div
          className="flex items-center gap-2 ml-4 pl-4"
          style={{ borderLeft: '1px solid rgba(73, 72, 71, 0.2)' }}
        >
          {/* Shield */}
          <div className="relative">
            <button
              onClick={onToggleShieldPopup}
              className="w-7 h-7 rounded-full flex items-center justify-center cursor-pointer hover:bg-white/10 transition-colors"
              style={{
                color: shieldCount > 0 ? 'var(--primary)' : 'var(--outline)',
              }}
              title={`Nsty Shield — ${shieldCount} blocked`}
            >
              <span className="material-symbols-outlined text-[18px]">shield</span>
              {shieldCount > 0 && (
                <span
                  className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] rounded-full flex items-center justify-center text-[8px] font-bold font-label"
                  style={{
                    background: 'var(--primary)',
                    color: 'var(--on-primary)',
                  }}
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

          {/* AI toggle */}
          <button
            onClick={onToggleAi}
            className="w-7 h-7 rounded-full flex items-center justify-center cursor-pointer hover:bg-white/10 transition-colors"
            style={{
              color: 'var(--primary)',
              background: 'rgba(206, 250, 5, 0.1)',
            }}
            title="Toggle AI panel"
          >
            <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
          </button>
        </div>
      </div>
    </div>
  )
}
