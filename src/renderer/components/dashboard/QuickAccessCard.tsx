import { createLogger } from '../../utils/logger'

const log = createLogger('QuickAccessCard')

interface QuickAccessItem {
  title: string
  url: string
  favicon?: string
}

interface QuickAccessCardProps {
  title: string
  icon: string
  items: QuickAccessItem[]
  emptyMessage: string
  animationClass?: string
  onItemClick: (url: string) => void
  loading?: boolean
}

export function QuickAccessCard({ title, icon: _icon, items, emptyMessage, animationClass = '', onItemClick, loading = false }: QuickAccessCardProps) {
  log.debug('render', { title, count: items.length, loading })
  return (
    <div
      className={`rounded-lg p-4 card-fade-up ${animationClass}`}
      style={{
        background: 'transparent',
        border: '1px solid var(--border-subtle)',
      }}
    >
      <div
        className="font-label text-[10px] uppercase mb-3"
        style={{ color: 'var(--on-surface-variant)', letterSpacing: '0.14em' }}
      >
        {title}
      </div>

      {loading ? (
        <div className="flex flex-col gap-2" aria-busy="true" aria-live="polite">
          {[0, 1, 2].map(i => (
            <div key={i} className="flex items-center gap-2.5 px-2 py-2">
              <div className="skeleton" style={{ width: 14, height: 14, borderRadius: 3 }} />
              <div
                className="skeleton"
                style={{ height: 10, flex: 1, maxWidth: `${70 - i * 12}%` }}
              />
            </div>
          ))}
        </div>
      ) : items.length > 0 ? (
        <div className="flex flex-col divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
          {items.slice(0, 5).map((item) => (
            <button type="button"
              key={item.url}
              onClick={() => onItemClick(item.url)}
              className="flex items-center gap-2.5 px-2 py-2 rounded-lg cursor-pointer transition-colors text-left hover-surface"
            >
              {item.favicon ? (
                <img src={item.favicon} className="w-3.5 h-3.5 rounded" alt="" loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none' }} />
              ) : (
                <span
                  className="w-3.5 h-3.5 rounded flex items-center justify-center text-[8px] font-bold"
                  style={{ background: 'rgba(var(--neutral-rgb), 0.08)', color: 'var(--on-surface-variant)' }}
                >
                  {item.title.charAt(0).toUpperCase()}
                </span>
              )}
              <span className="font-body text-xs truncate" style={{ color: 'var(--on-surface)' }}>
                {item.title}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="py-6 text-center">
          <p className="font-body text-[11px]" style={{ color: 'var(--on-surface-variant)' }}>{emptyMessage}</p>
        </div>
      )}
    </div>
  )
}
