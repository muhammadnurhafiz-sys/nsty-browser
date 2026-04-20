import type { ShieldStats } from '@shared/types'
import { NavControls } from './NavControls'
import { ShieldButton } from './ShieldButton'
import { AddressBar } from './AddressBar'

interface TopBarProps {
  currentUrl: string
  sidebarExpanded: boolean
  onToggleSidebar: () => void
  onBack: () => void
  onForward: () => void
  onReload: () => void
  onNavigate: (url: string) => void
  onOpenHistory: () => void
  shieldCount: number
  shieldStats: ShieldStats
  shieldPopupOpen: boolean
  onToggleShieldPopup: () => void
  onCloseShieldPopup: () => void
  onDisableShieldForSite: () => void
}

// Platform detection determines which chrome zone to reserve. macOS renders
// traffic lights at the left (~56px), Windows/Linux render min/max/close
// at the right (~138px). Padding keeps them from colliding with our controls.
const isMac = typeof navigator !== 'undefined' && /Macintosh|Mac OS X/.test(navigator.userAgent)
const CHROME_LEFT_PAD = isMac ? 72 : 8
const CHROME_RIGHT_PAD = isMac ? 8 : 148

export function TopBar({
  currentUrl,
  sidebarExpanded,
  onToggleSidebar,
  onBack,
  onForward,
  onReload,
  onNavigate,
  onOpenHistory,
  shieldCount,
  shieldStats,
  shieldPopupOpen,
  onToggleShieldPopup,
  onCloseShieldPopup,
  onDisableShieldForSite,
}: TopBarProps) {
  return (
    <header
      role="toolbar"
      aria-label="Browser toolbar"
      className="h-[44px] flex items-center gap-2 shrink-0 border-b"
      style={{
        WebkitAppRegion: 'drag',
        background: 'var(--surface-container-low)',
        borderColor: 'var(--border-subtle)',
        paddingLeft: CHROME_LEFT_PAD,
        paddingRight: CHROME_RIGHT_PAD,
      } as React.CSSProperties}
    >
      <button
        type="button"
        onClick={onToggleSidebar}
        className="w-7 h-7 rounded-md flex items-center justify-center cursor-pointer transition-colors hover-surface"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        aria-label={sidebarExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
        title={sidebarExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--outline)' }}>
          {sidebarExpanded ? 'left_panel_close' : 'left_panel_open'}
        </span>
      </button>

      <NavControls onBack={onBack} onForward={onForward} onReload={onReload} />

      <AddressBar currentUrl={currentUrl} onNavigate={onNavigate} />

      <ShieldButton
        count={shieldCount}
        stats={shieldStats}
        popupOpen={shieldPopupOpen}
        onToggle={onToggleShieldPopup}
        onClose={onCloseShieldPopup}
        onDisableForSite={onDisableShieldForSite}
      />

      <button
        type="button"
        onClick={onOpenHistory}
        className="w-7 h-7 rounded-md flex items-center justify-center cursor-pointer transition-colors hover-surface"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        aria-label="History"
        title="History"
      >
        <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--outline)' }}>history</span>
      </button>
    </header>
  )
}
