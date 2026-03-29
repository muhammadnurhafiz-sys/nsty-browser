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
    <div
      className={`rounded-xl p-4 card-fade-up ${animationClass}`}
      style={{
        background: 'rgba(206, 250, 5, 0.04)',
        border: '1px solid rgba(206, 250, 5, 0.1)',
        opacity: 0,
      }}
    >
      {/* Header */}
      <div
        className="font-label text-[10px] uppercase mb-3"
        style={{ color: 'rgba(206, 250, 5, 0.4)', letterSpacing: '0.1em' }}
      >
        {title}
      </div>

      {/* Items */}
      {items.length > 0 ? (
        <div className="flex flex-col">
          {items.slice(0, 5).map((item, i) => (
            <button
              key={item.url}
              onClick={() => onItemClick(item.url)}
              className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg cursor-pointer transition-colors text-left"
              style={{
                borderBottom: i < Math.min(items.length, 5) - 1 ? '1px solid rgba(206, 250, 5, 0.05)' : 'none',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-translucent-hover)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
            >
              {item.favicon ? (
                <img src={item.favicon} className="w-3.5 h-3.5 rounded" alt="" loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none' }} />
              ) : (
                <span
                  className="w-3.5 h-3.5 rounded flex items-center justify-center text-[8px] font-bold"
                  style={{ background: 'rgba(255, 255, 255, 0.1)', color: 'var(--on-surface-variant)' }}
                >
                  {item.title.charAt(0).toUpperCase()}
                </span>
              )}
              <span className="font-body text-xs truncate" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                {item.title}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="py-4 text-center">
          <p className="font-body text-[11px]" style={{ color: 'rgba(255, 255, 255, 0.3)' }}>{emptyMessage}</p>
        </div>
      )}
    </div>
  )
}
