interface SettingsSliderProps {
  value: number
  min?: number
  max?: number
  labelLeft?: string
  labelRight?: string
  onChange: (value: number) => void
}

export function SettingsSlider({
  value,
  min = 0,
  max = 100,
  labelLeft,
  labelRight,
  onChange,
}: SettingsSliderProps) {
  return (
    <div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1 rounded-lg appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, var(--primary) 0%, var(--primary) ${((value - min) / (max - min)) * 100}%, var(--surface-container-highest) ${((value - min) / (max - min)) * 100}%, var(--surface-container-highest) 100%)`,
          accentColor: 'var(--primary)',
        }}
      />
      {(labelLeft || labelRight) && (
        <div className="flex justify-between mt-2">
          <span className="font-label text-[10px] uppercase tracking-wider" style={{ color: 'var(--on-surface-variant)' }}>
            {labelLeft}
          </span>
          <span className="font-label text-[10px] uppercase tracking-wider" style={{ color: 'var(--primary)' }}>
            {labelRight}
          </span>
        </div>
      )}
    </div>
  )
}
