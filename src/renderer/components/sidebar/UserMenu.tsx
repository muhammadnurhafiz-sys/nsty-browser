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
      className="absolute bottom-full left-2 right-2 mb-1 rounded-lg shadow-xl overflow-hidden"
      style={{
        background: 'var(--bg-sidebar)',
        border: '1px solid var(--border-strong)',
      }}
    >
      <button
        onClick={() => { onOpenSettings(); onClose() }}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs cursor-pointer hover:bg-white/[0.06]"
        style={{ color: 'var(--text-primary)' }}
      >
        <span className="text-[10px]">⚙</span>
        Settings
      </button>
      <div
        className="w-full flex items-center gap-2 px-3 py-2 text-xs"
        style={{ color: 'var(--text-muted)' }}
        title="Coming soon"
      >
        <span className="text-[10px]">↪</span>
        Sign out
      </div>
    </div>
  )
}
