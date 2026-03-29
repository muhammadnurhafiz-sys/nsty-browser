import type { SettingItem } from '../../hooks/useSettings'
import { SettingsToggle } from '../settings/SettingsToggle'
import { SettingsSlider } from '../settings/SettingsSlider'
import { SettingsSegmented } from '../settings/SettingsSegmented'

interface SettingsCommandListProps {
  items: SettingItem[]
  filter: string
}

export function SettingsCommandList({ items, filter }: SettingsCommandListProps) {
  const filtered = filter
    ? items.filter(item =>
        item.label.toLowerCase().includes(filter.toLowerCase()) ||
        item.description.toLowerCase().includes(filter.toLowerCase())
      )
    : items

  // Group by category
  const grouped = filtered.reduce<Record<string, SettingItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = []
    acc[item.category].push(item)
    return acc
  }, {})

  if (filtered.length === 0) {
    return (
      <div className="px-3 py-4 text-center">
        <span className="font-body text-[11px]" style={{ color: 'rgba(206, 250, 5, 0.35)' }}>
          No settings match "{filter}"
        </span>
      </div>
    )
  }

  return (
    <div className="overflow-y-auto hide-scrollbar expand-down" style={{ maxHeight: '50vh' }}>
      {Object.entries(grouped).map(([category, categoryItems]) => (
        <div key={category} className="px-2 py-1">
          <div
            className="font-label text-[9px] uppercase px-2 py-1"
            style={{ color: 'rgba(206, 250, 5, 0.3)', letterSpacing: '0.1em' }}
          >
            {category}
          </div>
          {categoryItems.map(item => (
            <SettingRow key={item.id} item={item} />
          ))}
        </div>
      ))}
    </div>
  )
}

function SettingRow({ item }: { item: SettingItem }) {
  return (
    <div
      className="flex items-center justify-between gap-2 px-2 py-2 rounded-lg transition-colors hover-surface"
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'rgba(206, 250, 5, 0.4)' }}>
          {item.icon}
        </span>
        <div className="min-w-0">
          <div className="font-body text-[11px] truncate" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
            {item.label}
          </div>
          <div className="font-body text-[9px] truncate" style={{ color: 'rgba(255, 255, 255, 0.35)' }}>
            {item.description}
          </div>
        </div>
      </div>
      <div className="flex-shrink-0">
        <SettingControl item={item} />
      </div>
    </div>
  )
}

function SettingControl({ item }: { item: SettingItem }) {
  switch (item.type) {
    case 'toggle':
      return (
        <SettingsToggle
          checked={item.value as boolean}
          onChange={(v) => item.onChange(v)}
        />
      )
    case 'slider':
      return (
        <div style={{ width: 80 }}>
          <SettingsSlider
            value={item.value as number}
            min={item.min}
            max={item.max}
            onChange={(v) => item.onChange(v)}
          />
        </div>
      )
    case 'segmented':
      return (
        <SettingsSegmented
          options={(item.options ?? []).map(o => ({ id: String(o.value), label: o.label }))}
          value={String(item.value)}
          onChange={(v) => {
            // Convert back to original type
            const opt = item.options?.find(o => String(o.value) === v)
            if (opt) item.onChange(opt.value)
          }}
        />
      )
    case 'input':
      return (
        <input
          type="password"
          value={item.value as string}
          onChange={(e) => item.onChange(e.target.value)}
          placeholder="Enter key..."
          className="font-body text-[10px] px-2 py-1 rounded"
          style={{
            width: 80,
            background: 'var(--surface-translucent-hover)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--on-surface)',
          }}
        />
      )
    default:
      return null
  }
}
