import type { ShieldStats } from '@shared/types'
import { NavControls } from './NavControls'
import { ShieldButton } from './ShieldButton'
import { AddressBar } from './AddressBar'
import { createLogger } from '../../utils/logger'

const log = createLogger('TopBar')

interface TopBarProps {
  currentUrl: string
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

// Left pad reserves the macOS traffic-lights zone (~56px); right pad reserves
// the Windows/Linux titlebar-overlay controls zone (~138px). Without these,
// our own buttons collide with the native window chrome.
const platform = window.nsty?.platform ?? 'unknown'
const isMac = platform === 'darwin'
const CHROME_LEFT_PAD = isMac ? 72 : 8
const CHROME_RIGHT_PAD = isMac ? 8 : 148

export function TopBar({
  currentUrl,
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
  log.debug('render', { currentUrl, shieldCount })
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
      {/* Grid beats flex-math: a 3-track layout [nav | pill | actions] with an
          explicit clamp on the pill keeps it centered on wide windows and
          lets it shrink predictably on narrow ones, without twin flex-1
          spacers whose min-content rules previously squeezed the pill out
          of view entirely on Linux (148px right pad for titlebar overlay). */}
      <div
        className="w-full h-full grid items-center gap-2"
        style={{ gridTemplateColumns: 'auto minmax(0, 1fr) auto' }}
      >
        <NavControls onBack={onBack} onForward={onForward} onReload={onReload} />

        <div
          className="justify-self-center w-full"
          style={{ maxWidth: 'clamp(280px, 40vw, 460px)' }}
        >
          <AddressBar currentUrl={currentUrl} onNavigate={onNavigate} />
        </div>

        <div
          className="flex items-center gap-1"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
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
            aria-label="History"
            title="History"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--outline)' }}>history</span>
          </button>
        </div>
      </div>
    </header>
  )
}
