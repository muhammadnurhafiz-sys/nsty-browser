interface ModelSelectorProps {
  model: 'sonnet' | 'haiku' | 'opus'
  onChange: (model: 'sonnet' | 'haiku' | 'opus') => void
}

const MODELS = [
  { id: 'haiku' as const, label: 'H' },
  { id: 'sonnet' as const, label: 'S' },
  { id: 'opus' as const, label: 'O' },
]

export function ModelSelector({ model, onChange }: ModelSelectorProps) {
  return (
    <div
      className="flex rounded-lg p-0.5"
      style={{
        background: 'var(--surface-container)',
        border: '1px solid rgba(73, 72, 71, 0.15)',
      }}
    >
      {MODELS.map(m => {
        const isActive = model === m.id
        return (
          <button
            key={m.id}
            onClick={() => onChange(m.id)}
            className="px-2 py-0.5 font-label text-[10px] uppercase cursor-pointer transition-all rounded-md"
            style={{
              background: isActive ? 'var(--primary)' : 'transparent',
              color: isActive ? 'var(--on-primary)' : 'var(--outline)',
              fontWeight: isActive ? 700 : 400,
              boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.3)' : 'none',
            }}
            title={m.id.charAt(0).toUpperCase() + m.id.slice(1)}
          >
            {m.label}
          </button>
        )
      })}
    </div>
  )
}
