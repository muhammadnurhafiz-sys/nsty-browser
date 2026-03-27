import type { Tab } from '@shared/types'

interface TabItemProps {
  tab: Tab
  isActive: boolean
  onSwitch: (tabId: string) => void
  onClose: (tabId: string) => void
  onPin: (tab: Tab) => void
}

export function TabItem({ tab, isActive, onSwitch, onClose, onPin }: TabItemProps) {
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    onPin(tab)
  }

  const handleMiddleClick = (e: React.MouseEvent) => {
    if (e.button === 1) {
      e.preventDefault()
      onClose(tab.id)
    }
  }

  return (
    <div
      onClick={() => onSwitch(tab.id)}
      onAuxClick={handleMiddleClick}
      onContextMenu={handleContextMenu}
      className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer group transition-colors"
      style={{
        background: isActive ? 'rgba(255,255,255,0.08)' : 'transparent',
      }}
    >
      {tab.faviconUrl ? (
        <img src={tab.faviconUrl} className="w-4 h-4 rounded-sm flex-shrink-0" alt="" />
      ) : (
        <div
          className="w-4 h-4 rounded-sm flex items-center justify-center text-[8px] flex-shrink-0"
          style={{ background: 'var(--orange)' }}
        >
          {tab.title.charAt(0).toUpperCase()}
        </div>
      )}
      <span
        className="text-xs truncate flex-1"
        style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)' }}
      >
        {tab.title}
      </span>
      <button
        onClick={(e) => { e.stopPropagation(); onClose(tab.id) }}
        className="hidden group-hover:flex w-4 h-4 rounded items-center justify-center text-[10px] cursor-pointer hover:bg-white/10"
        style={{ color: 'var(--text-muted)' }}
      >
        ×
      </button>
    </div>
  )
}
