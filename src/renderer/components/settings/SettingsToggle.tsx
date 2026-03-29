interface SettingsToggleProps {
  checked: boolean
  onChange: (value: boolean) => void
}

export function SettingsToggle({ checked, onChange }: SettingsToggleProps) {
  return (
    <button
      onClick={() => onChange(!checked)}
      role="switch"
      aria-checked={checked}
      className="w-11 h-6 rounded-full relative cursor-pointer transition-colors duration-200"
      style={{
        background: checked ? 'var(--primary-container)' : 'var(--surface-container-highest)',
        border: checked ? 'none' : '1px solid rgba(73, 72, 71, 0.3)',
      }}
    >
      <div
        className="w-4 h-4 rounded-full absolute top-[4px] transition-all duration-200"
        style={{
          background: checked ? 'var(--on-primary-container)' : 'var(--on-surface-variant)',
          left: checked ? 22 : 4,
        }}
      />
    </button>
  )
}
