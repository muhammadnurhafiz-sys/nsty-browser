import { useEffect, useRef } from 'react'
import { createLogger } from '../../utils/logger'

const log = createLogger('UserMenu')

interface UserMenuProps {
  onOpenSettings: () => void
  onClose: () => void
}

export function UserMenu({ onOpenSettings, onClose }: UserMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        log.debug('outside click close')
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  return (
    <div
      ref={menuRef}
      className="menu-container absolute bottom-full right-0 mb-2 w-44 fade-in"
      style={{ zIndex: 50 }}
      role="menu"
    >
      <button
        type="button"
        role="menuitem"
        onClick={() => { onOpenSettings(); onClose() }}
        className="menu-item font-body text-xs"
      >
        <span className="material-symbols-outlined text-[16px]" style={{ color: 'var(--outline)' }}>settings</span>
        Settings
      </button>
      <hr className="menu-separator" />
      <button
        type="button"
        role="menuitem"
        aria-disabled="true"
        disabled
        className="menu-item font-body text-xs"
        title="Coming soon"
      >
        <span className="material-symbols-outlined text-[16px]">logout</span>
        Sign out
      </button>
    </div>
  )
}
