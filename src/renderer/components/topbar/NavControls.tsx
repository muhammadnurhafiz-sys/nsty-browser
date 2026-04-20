interface NavControlsProps {
  onBack: () => void
  onForward: () => void
  onReload: () => void
}

export function NavControls({ onBack, onForward, onReload }: NavControlsProps) {
  return (
    <div
      className="flex items-center gap-1"
      style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
    >
      <NavButton icon="arrow_back" label="Back" onClick={onBack} />
      <NavButton icon="arrow_forward" label="Forward" onClick={onForward} />
      <NavButton icon="refresh" label="Reload" onClick={onReload} />
    </div>
  )
}

function NavButton({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-7 h-7 rounded-md flex items-center justify-center cursor-pointer transition-colors hover-surface"
      aria-label={label}
      title={label}
    >
      <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--outline)' }}>{icon}</span>
    </button>
  )
}
