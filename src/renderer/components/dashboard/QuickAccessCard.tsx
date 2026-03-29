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
}

export function QuickAccessCard({ title, icon, items, emptyMessage, animationClass = '', onItemClick }: QuickAccessCardProps) {
  return (
    <div className={`card-base card-fade-up ${animationClass} p-5 flex flex-col`} style={{ opacity: 0 }}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <span
          className="material-symbols-outlined text-[18px]"
          style={{ color: 'var(--primary)' }}
        >
          {icon}
        </span>
        <span className="text-display text-xs" style={{ color: 'var(--on-surface-variant)' }}>
          {title}
        </span>
      </div>

      {/* Items */}
      {items.length > 0 ? (
        <div className="flex flex-col gap-1">
          {items.slice(0, 5).map((item) => (
            <button
              key={item.url}
              onClick={() => onItemClick(item.url)}
              className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors text-left"
              style={{ color: 'var(--on-surface)' }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              {item.favicon ? (
                <img src={item.favicon} className="w-4 h-4 rounded" alt={`${item.title} favicon`} loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none' }} />
              ) : (
                <span
                  className="w-4 h-4 rounded flex items-center justify-center text-[9px] font-bold font-label"
                  style={{ background: 'var(--surface-container-highest)', color: 'var(--primary)' }}
                >
                  {item.title.charAt(0).toUpperCase()}
                </span>
              )}
              <span className="font-body text-sm truncate">{item.title}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center py-6">
          <p className="font-body text-sm" style={{ color: 'var(--outline)' }}>{emptyMessage}</p>
        </div>
      )}
    </div>
  )
}
