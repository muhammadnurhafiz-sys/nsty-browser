interface SettingsSegmentedProps<T extends string> {
  options: { id: T; label: string }[]
  value: T
  onChange: (value: T) => void
}

export function SettingsSegmented<T extends string>({ options, value, onChange }: SettingsSegmentedProps<T>) {
  return (
    <div
      className="flex rounded-lg p-1"
      style={{
        background: 'var(--surface-container)',
        border: '1px solid rgba(73, 72, 71, 0.15)',
      }}
    >
      {options.map(opt => {
        const isActive = value === opt.id
        return (
          <button type="button"
            key={opt.id}
            onClick={() => onChange(opt.id)}
            className="px-3 py-1 font-label text-xs uppercase cursor-pointer transition-all rounded-md"
            style={{
              background: isActive ? 'var(--primary)' : 'transparent',
              color: isActive ? 'var(--on-primary)' : 'var(--on-surface-variant)',
              fontWeight: isActive ? 700 : 400,
              boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.3)' : 'none',
            }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
