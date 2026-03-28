import { useEffect, useRef } from 'react'

interface UserMenuProps {
  onOpenSettings: () => void
  onClose: () => void
}

export function UserMenu({ onOpenSettings, onClose }: UserMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  return (
    <div
      ref={menuRef}
      className="absolute bottom-full left-1 mb-2 w-44 rounded-xl shadow-xl overflow-hidden glass-panel fade-in"
    >
      <button
        onClick={() => { onOpenSettings(); onClose() }}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 font-body text-xs cursor-pointer transition-colors"
        style={{ color: 'var(--on-surface)' }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)' }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
      >
        <span className="material-symbols-outlined text-[16px]" style={{ color: 'var(--outline)' }}>settings</span>
        Settings
      </button>
      <div
        className="w-full flex items-center gap-2.5 px-3 py-2.5 font-body text-xs"
        style={{ color: 'var(--outline)', borderTop: '1px solid rgba(73, 72, 71, 0.1)' }}
        title="Coming soon"
      >
        <span className="material-symbols-outlined text-[16px]">logout</span>
        Sign out
      </div>
    </div>
  )
}
