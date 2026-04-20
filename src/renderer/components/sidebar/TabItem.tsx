import type { Tab } from '@shared/types'
import { createLogger } from '../../utils/logger'

const log = createLogger('TabItem')

interface TabItemProps {
  tab: Tab
  isActive: boolean
  onSwitch: (tabId: string) => void
  onClose: (tabId: string) => void
  onPin: (tab: Tab) => void
}

export function TabItem({ tab, isActive, onSwitch, onClose, onPin }: TabItemProps) {
  log.debug('render', { id: tab.id, isActive })

  const handleContextMenu = (e: React.MouseEvent): void => {
    log.debug('pin', { id: tab.id })
    e.preventDefault()
    onPin(tab)
  }

  const handleMiddleClick = (e: React.MouseEvent): void => {
    if (e.button === 1) {
      log.debug('middle-click close', { id: tab.id })
      e.preventDefault()
      onClose(tab.id)
    }
  }

  return (
    <div
      className="group relative flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-lg transition-[background,opacity] duration-150 ease-out hover-surface"
      style={{
        background: isActive ? 'var(--surface-translucent-active)' : 'transparent',
        opacity: isActive ? 1 : 0.72,
      }}
    >
      {/* Active accent bar — replaces the neon border treatment */}
      {isActive && (
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: 4,
            top: 8,
            bottom: 8,
            width: 2,
            borderRadius: 2,
            background: 'var(--primary-hot)',
          }}
        />
      )}
      <button
        type="button"
        onClick={() => onSwitch(tab.id)}
        onAuxClick={handleMiddleClick}
        onContextMenu={handleContextMenu}
        aria-label={`Switch to ${tab.title}`}
        aria-current={isActive ? 'page' : undefined}
        title={`${tab.title} · middle-click to close · right-click to pin`}
        className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer appearance-none bg-transparent text-left border-0 p-0"
      >
        {tab.faviconUrl ? (
          <img src={tab.faviconUrl} className="w-3.5 h-3.5 rounded-sm flex-shrink-0" alt="" loading="lazy" />
        ) : (
          <div
            className="w-3.5 h-3.5 rounded-sm flex items-center justify-center text-[7px] font-bold flex-shrink-0"
            style={{ background: 'var(--border-interactive)', color: 'var(--on-surface-variant)' }}
            aria-hidden="true"
          >
            {tab.title.charAt(0).toUpperCase()}
          </div>
        )}
        <span
          className="font-body text-xs truncate"
          style={{
            color: isActive ? 'var(--on-surface)' : 'var(--on-surface-variant)',
            fontWeight: isActive ? 500 : 400,
          }}
        >
          {tab.title}
        </span>
      </button>
      <button
        type="button"
        onClick={() => onClose(tab.id)}
        aria-label={`Close ${tab.title}`}
        className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 flex w-5 h-5 rounded items-center justify-center cursor-pointer hover:bg-white/10 transition-opacity flex-shrink-0"
        style={{ color: 'var(--on-surface-variant)' }}
      >
        <span className="material-symbols-outlined text-[12px]" aria-hidden="true">close</span>
      </button>
    </div>
  )
}
