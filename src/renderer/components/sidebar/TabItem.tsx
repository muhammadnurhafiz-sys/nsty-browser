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
      className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer group transition-all duration-200"
      style={{
        background: isActive ? 'var(--surface-container-high)' : 'transparent',
        borderLeft: isActive ? '2px solid var(--primary)' : '2px solid transparent',
      }}
    >
      {tab.faviconUrl ? (
        <img src={tab.faviconUrl} className="w-4 h-4 rounded-sm flex-shrink-0" alt={`${tab.title} favicon`} />
      ) : (
        <div
          className="w-4 h-4 rounded-sm flex items-center justify-center text-[8px] font-bold flex-shrink-0"
          style={{ background: 'var(--surface-container-highest)', color: 'var(--primary)' }}
        >
          {tab.title.charAt(0).toUpperCase()}
        </div>
      )}
      <span
        className="font-body text-xs truncate flex-1"
        style={{ color: isActive ? 'var(--on-surface)' : 'var(--on-surface-variant)' }}
      >
        {tab.title}
      </span>
      <button
        onClick={(e) => { e.stopPropagation(); onClose(tab.id) }}
        aria-label={`Close ${tab.title}`}
        className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 flex w-6 h-6 rounded-full items-center justify-center cursor-pointer hover:bg-white/10 transition-opacity"
        style={{ color: 'var(--outline)' }}
      >
        <span className="material-symbols-outlined text-[14px]" aria-hidden="true">close</span>
      </button>
    </div>
  )
}
