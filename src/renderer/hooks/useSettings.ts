import { useState, useCallback, useMemo } from 'react'

function usePersisted<T>(key: string, defaultValue: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(`nsty-settings:${key}`)
      return stored !== null ? JSON.parse(stored) : defaultValue
    } catch {
      return defaultValue
    }
  })
  const setPersisted = useCallback((v: T) => {
    setValue(v)
    try { localStorage.setItem(`nsty-settings:${key}`, JSON.stringify(v)) } catch { /* ignore */ }
  }, [key])
  return [value, setPersisted]
}

export type SettingType = 'toggle' | 'slider' | 'segmented' | 'input'

export interface SettingItem {
  id: string
  label: string
  description: string
  category: string
  icon: string
  type: SettingType
  value: unknown
  onChange: (value: unknown) => void
  options?: { label: string; value: unknown }[]
  min?: number
  max?: number
  minLabel?: string
  maxLabel?: string
}

export function useSettings() {
  const [shieldEnabled, setShieldEnabled] = usePersisted('shield', true)
  const [obsidianIntensity, setObsidianIntensity] = usePersisted('obsidian-intensity', 75)
  const [holoAccents, setHoloAccents] = usePersisted('holo-accents', true)
  const [autoHide, setAutoHide] = usePersisted('auto-hide', false)
  const [compactTypo, setCompactTypo] = usePersisted<'off' | 'on'>('compact-typo', 'on')
  const [zoomLevel, setZoomLevel] = usePersisted('zoom-level', 100)
  const [localOnly, setLocalOnly] = usePersisted('local-only', true)
  const [biometric, setBiometric] = usePersisted('biometric', false)
  const [encryptedTelemetry, setEncryptedTelemetry] = usePersisted('telemetry', true)
  const [defaultModel, setDefaultModel] = usePersisted<'sonnet' | 'haiku' | 'opus'>('default-model', 'sonnet')
  const [apiKey, setApiKey] = usePersisted('api-key', '')
  const [autoArchiveHours, setAutoArchiveHours] = usePersisted('auto-archive', 12)

  const items: SettingItem[] = useMemo(() => [
    // Interface
    { id: 'obsidian-intensity', label: 'Obsidian Intensity', description: 'Adjust theme intensity', category: 'Interface', icon: 'contrast', type: 'slider' as const, value: obsidianIntensity, onChange: (v: unknown) => setObsidianIntensity(v as number), min: 0, max: 100, minLabel: 'Subtle', maxLabel: 'Monolith' },
    { id: 'holo-accents', label: 'Holographic Accents', description: 'Light refraction on active elements', category: 'Interface', icon: 'auto_awesome', type: 'toggle' as const, value: holoAccents, onChange: (v: unknown) => setHoloAccents(v as boolean) },
    { id: 'auto-hide', label: 'Agentic Auto-Hide', description: 'Sidebar recedes on focus', category: 'Interface', icon: 'visibility_off', type: 'toggle' as const, value: autoHide, onChange: (v: unknown) => setAutoHide(v as boolean) },
    { id: 'compact-typo', label: 'Compact Typography', description: 'Denser text layout', category: 'Interface', icon: 'text_fields', type: 'segmented' as const, value: compactTypo, onChange: (v: unknown) => setCompactTypo(v as 'off' | 'on'), options: [{ label: 'Off', value: 'off' }, { label: 'On', value: 'on' }] },
    { id: 'zoom-level', label: 'Global Zoom Level', description: 'Default page zoom', category: 'Interface', icon: 'zoom_in', type: 'slider' as const, value: zoomLevel, onChange: (v: unknown) => setZoomLevel(v as number), min: 80, max: 150, minLabel: '80%', maxLabel: '150%' },

    // Privacy & Security
    { id: 'shield', label: 'Ad Blocking', description: 'Block ads and trackers', category: 'Privacy', icon: 'shield', type: 'toggle' as const, value: shieldEnabled, onChange: (v: unknown) => setShieldEnabled(v as boolean) },
    { id: 'local-only', label: 'Local-Only Processing', description: 'Keep data on device', category: 'Privacy', icon: 'lock', type: 'toggle' as const, value: localOnly, onChange: (v: unknown) => setLocalOnly(v as boolean) },
    { id: 'biometric', label: 'Biometric Unlock', description: 'Use fingerprint or face', category: 'Privacy', icon: 'fingerprint', type: 'toggle' as const, value: biometric, onChange: (v: unknown) => setBiometric(v as boolean) },
    { id: 'telemetry', label: 'Encrypted Telemetry', description: 'Anonymous usage stats', category: 'Privacy', icon: 'analytics', type: 'toggle' as const, value: encryptedTelemetry, onChange: (v: unknown) => setEncryptedTelemetry(v as boolean) },

    // AI / Agent Protocols
    { id: 'default-model', label: 'Default Model', description: 'Claude model for AI features', category: 'AI', icon: 'psychology', type: 'segmented' as const, value: defaultModel, onChange: (v: unknown) => setDefaultModel(v as 'sonnet' | 'haiku' | 'opus'), options: [{ label: 'Haiku', value: 'haiku' }, { label: 'Sonnet', value: 'sonnet' }, { label: 'Opus', value: 'opus' }] },
    { id: 'api-key', label: 'API Key', description: 'Anthropic API key', category: 'AI', icon: 'key', type: 'input' as const, value: apiKey, onChange: (v: unknown) => setApiKey(v as string) },

    // Sync & Vault
    { id: 'auto-archive', label: 'Auto-archive Tabs', description: 'Close inactive tabs after', category: 'Sync', icon: 'archive', type: 'segmented' as const, value: autoArchiveHours, onChange: (v: unknown) => setAutoArchiveHours(v as number), options: [{ label: '6h', value: 6 }, { label: '12h', value: 12 }, { label: '24h', value: 24 }, { label: '48h', value: 48 }, { label: 'Never', value: 0 }] },
  ], [obsidianIntensity, holoAccents, autoHide, compactTypo, zoomLevel, shieldEnabled, localOnly, biometric, encryptedTelemetry, defaultModel, apiKey, autoArchiveHours, setZoomLevel, setShieldEnabled, setObsidianIntensity, setLocalOnly, setDefaultModel, setHoloAccents, setCompactTypo, setAutoArchiveHours, setEncryptedTelemetry, setBiometric, setAutoHide, setApiKey])

  const filterItems = useCallback((search: string): SettingItem[] => {
    if (!search) return items
    const lower = search.toLowerCase()
    return items.filter(item =>
      item.label.toLowerCase().includes(lower) ||
      item.description.toLowerCase().includes(lower) ||
      item.category.toLowerCase().includes(lower)
    )
  }, [items])

  return { items, filterItems }
}
