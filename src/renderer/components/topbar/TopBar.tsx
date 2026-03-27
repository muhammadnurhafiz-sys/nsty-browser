import { AddressBar } from './AddressBar'

interface TopBarProps {
  url: string
  onNavigate: (url: string) => void
  onBack: () => void
  onForward: () => void
  onReload: () => void
  shieldCount: number
  onToggleAi: () => void
}

export function TopBar({
  url,
  onNavigate,
  onBack,
  onForward,
  onReload,
  shieldCount,
  onToggleAi,
}: TopBarProps) {
  return (
    <div
      className="h-[42px] flex items-center px-3 gap-2"
      style={{
        background: '#1e1e3a',
        borderBottom: '1px solid var(--border)',
        WebkitAppRegion: 'drag',
      } as React.CSSProperties}
    >
      {/* Navigation buttons */}
      <div className="flex gap-1" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <button
          onClick={onBack}
          className="w-[26px] h-[26px] rounded-md flex items-center justify-center text-sm cursor-pointer hover:brightness-125"
          style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}
          title="Back"
        >
          ←
        </button>
        <button
          onClick={onForward}
          className="w-[26px] h-[26px] rounded-md flex items-center justify-center text-sm cursor-pointer hover:brightness-125"
          style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}
          title="Forward"
        >
          →
        </button>
        <button
          onClick={onReload}
          className="w-[26px] h-[26px] rounded-md flex items-center justify-center text-sm cursor-pointer hover:brightness-125"
          style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}
          title="Reload"
        >
          ↻
        </button>
      </div>

      {/* Address bar */}
      <div className="flex-1" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <AddressBar url={url} onNavigate={onNavigate} />
      </div>

      {/* Shield icon */}
      <button
        className="w-7 h-7 rounded-md flex items-center justify-center text-sm cursor-pointer"
        style={{
          background: shieldCount > 0 ? 'rgba(124,58,237,0.2)' : 'var(--bg-hover)',
          WebkitAppRegion: 'no-drag',
        } as React.CSSProperties}
        title={`Nsty Shield — ${shieldCount} ads blocked`}
      >
        🛡️
      </button>

      {/* Claude AI toggle */}
      <button
        onClick={onToggleAi}
        className="w-7 h-7 rounded-md flex items-center justify-center text-[13px] cursor-pointer"
        style={{
          background: 'rgba(251,146,60,0.2)',
          WebkitAppRegion: 'no-drag',
        } as React.CSSProperties}
        title="Toggle Claude AI panel"
      >
        ✨
      </button>
    </div>
  )
}
