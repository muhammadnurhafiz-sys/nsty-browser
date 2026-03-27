interface ModelSelectorProps {
  model: 'sonnet' | 'haiku' | 'opus'
  onChange: (model: 'sonnet' | 'haiku' | 'opus') => void
}

const MODELS = [
  { id: 'sonnet' as const, label: 'Sonnet', desc: 'Balanced' },
  { id: 'haiku' as const, label: 'Haiku', desc: 'Fast' },
  { id: 'opus' as const, label: 'Opus', desc: 'Deep' },
]

export function ModelSelector({ model, onChange }: ModelSelectorProps) {
  return (
    <select
      value={model}
      onChange={(e) => onChange(e.target.value as 'sonnet' | 'haiku' | 'opus')}
      className="text-[10px] rounded px-1.5 py-0.5 outline-none cursor-pointer"
      style={{
        background: 'rgba(255,255,255,0.06)',
        color: 'var(--text-muted)',
        border: 'none',
      }}
    >
      {MODELS.map(m => (
        <option key={m.id} value={m.id}>{m.label}</option>
      ))}
    </select>
  )
}
