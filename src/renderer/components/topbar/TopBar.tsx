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
      <NavControls onBack={onBack} onForward={onForward} onReload={onReload} />

      {/* Arc-style: address bar is a centered pill, not a full-width input.
          Flex-1 on both sides pushes it to the middle; max-width keeps it
          from stretching on wide monitors. */}
      <div className="flex-1 flex justify-end min-w-0" />
      <div className="w-full max-w-[460px] flex-shrink">
        <AddressBar currentUrl={currentUrl} onNavigate={onNavigate} />
      </div>
      <div className="flex-1 flex justify-start min-w-0" />

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
