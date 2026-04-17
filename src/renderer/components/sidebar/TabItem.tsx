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
      className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer group transition-all duration-150"
      style={{
        background: isActive ? 'var(--surface-translucent-active)' : 'transparent',
        border: isActive ? '1px solid var(--border-active)' : '1px solid transparent',
        opacity: isActive ? 1 : 0.5,
      }}
    >
      {tab.faviconUrl ? (
        <img src={tab.faviconUrl} className="w-3.5 h-3.5 rounded-sm flex-shrink-0" alt={`${tab.title} favicon`} loading="lazy" />
      ) : (
        <div
          className="w-3.5 h-3.5 rounded-sm flex items-center justify-center text-[7px] font-bold flex-shrink-0"
          style={{ background: 'rgba(255, 255, 255, 0.1)', color: 'var(--on-surface-variant)' }}
        >
          {tab.title.charAt(0).toUpperCase()}
        </div>
      )}
      <span
        className="font-body text-xs truncate flex-1"
        style={{ color: isActive ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.5)' }}
      >
        {tab.title}
      </span>
      <button type="button"
        onClick={(e) => { e.stopPropagation(); onClose(tab.id) }}
        aria-label={`Close ${tab.title}`}
        className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 flex w-5 h-5 rounded items-center justify-center cursor-pointer hover:bg-white/10 transition-opacity"
        style={{ color: isActive ? 'rgba(206, 250, 5, 0.3)' : 'rgba(255, 255, 255, 0.15)' }}
      >
        <span className="material-symbols-outlined text-[12px]" aria-hidden="true">close</span>
      </button>
    </div>
  )
}
