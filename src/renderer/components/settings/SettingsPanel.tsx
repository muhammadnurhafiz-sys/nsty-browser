import { useState } from 'react'
import { SettingsToggle } from './SettingsToggle'
import { SettingsSlider } from './SettingsSlider'
import { SettingsSegmented } from './SettingsSegmented'

interface SettingsPanelProps {
  isOpen: boolean
  onClose: () => void
}

type Category = 'interface' | 'privacy' | 'agents' | 'extensions' | 'sync'

const CATEGORIES: { id: Category; icon: string; label: string }[] = [
  { id: 'interface', icon: 'palette', label: 'Interface' },
  { id: 'privacy', icon: 'shield', label: 'Privacy & Security' },
  { id: 'agents', icon: 'psychology', label: 'Agent Protocols' },
  { id: 'extensions', icon: 'extension', label: 'Extensions' },
  { id: 'sync', icon: 'database', label: 'Sync & Vault' },
]

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const [activeCategory, setActiveCategory] = useState<Category>('interface')

  // Settings state
  const [apiKey, setApiKey] = useState('')
  const [apiKeySaved, setApiKeySaved] = useState(false)
  const [defaultModel, setDefaultModel] = useState<'sonnet' | 'haiku' | 'opus'>('sonnet')
  const [shieldEnabled, setShieldEnabled] = useState(true)
  const [autoArchiveHours, setAutoArchiveHours] = useState(12)
  const [obsidianIntensity, setObsidianIntensity] = useState(75)
  const [holoAccents, setHoloAccents] = useState(true)
  const [autoHide, setAutoHide] = useState(false)
  const [compactTypo, setCompactTypo] = useState<'off' | 'on'>('on')
  const [zoomLevel, setZoomLevel] = useState(100)
  const [localOnly, setLocalOnly] = useState(true)
  const [biometric, setBiometric] = useState(false)
  const [encryptedTelemetry, setEncryptedTelemetry] = useState(true)

  const handleSaveApiKey = () => {
    if (!apiKey.trim()) return
    const event = new CustomEvent('settings:saveApiKey', { detail: apiKey })
    window.dispatchEvent(event)
    setApiKeySaved(true)
    setApiKey('')
    setTimeout(() => setApiKeySaved(false), 2000)
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div className="settings-backdrop fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose} />

      {/* Full-page panel */}
      <div
        className="settings-panel fixed inset-0 z-50 overflow-y-auto hide-scrollbar"
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        style={{
          marginLeft: 80,
          background: 'var(--surface)',
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Close settings"
          className="fixed top-6 right-6 z-50 w-9 h-9 rounded-full flex items-center justify-center cursor-pointer hover:bg-white/10 transition-colors"
          style={{ color: 'var(--outline)', background: 'var(--surface-container)' }}
        >
          <span className="material-symbols-outlined text-[20px]" aria-hidden="true">close</span>
        </button>

        <main className="pt-16 pb-12 px-12 min-h-screen">
          <div className="max-w-6xl mx-auto">
            {/* Hero Header */}
            <div className="mb-12">
              <p
                className="font-label tracking-[0.3em] text-[0.75rem] mb-2 uppercase"
                style={{ color: 'var(--primary)' }}
              >
                System Configuration
              </p>
              <h1 className="font-headline text-5xl font-bold tracking-tighter mb-4" style={{ color: 'var(--on-surface)' }}>
                Command Center
              </h1>
              <p className="font-body max-w-xl" style={{ color: 'var(--on-surface-variant)' }}>
                Fine-tune the Obsidian engine. Adjust agent protocols, interface dynamics, and security parameters from a monolithic control plane.
              </p>
            </div>

            {/* Settings Layout: 12-col grid */}
            <div className="grid grid-cols-12 gap-6">
              {/* Category Navigation */}
              <div className="col-span-12 lg:col-span-3 space-y-2">
                {CATEGORIES.map(cat => {
                  const isActive = activeCategory === cat.id
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setActiveCategory(cat.id)}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all cursor-pointer"
                      style={{
                        background: isActive ? 'var(--surface-container-high)' : 'transparent',
                        color: isActive ? 'var(--primary)' : 'var(--on-surface-variant)',
                        border: isActive ? '1px solid rgba(73, 72, 71, 0.15)' : '1px solid transparent',
                      }}
                    >
                      <span className="material-symbols-outlined text-[20px]">{cat.icon}</span>
                      <span className="font-body text-sm">{cat.label}</span>
                    </button>
                  )
                })}
              </div>

              {/* Content Area */}
              <div className="col-span-12 lg:col-span-9 space-y-8">
                {activeCategory === 'interface' && (
                  <>
                    {/* Personalization */}
                    <Section title="Personalization">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Theme Preview */}
                        <div className="space-y-4">
                          <label className="font-label text-xs uppercase tracking-widest" style={{ color: 'var(--on-surface-variant)' }}>
                            Active Theme
                          </label>
                          <div
                            className="relative aspect-video rounded-xl overflow-hidden cursor-pointer group"
                            style={{ border: '1px solid rgba(73, 72, 71, 0.3)' }}
                          >
                            <div
                              className="w-full h-full transition-transform duration-700 group-hover:scale-105"
                              style={{
                                background: 'linear-gradient(135deg, #0e0e0e 0%, #1a1919 30%, #131313 60%, #201f1f 100%)',
                              }}
                            />
                            <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, var(--surface) 0%, transparent 60%)' }} />
                            <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                              <div>
                                <h3 className="font-headline font-bold text-lg" style={{ color: 'var(--on-surface)' }}>Digital Obsidian</h3>
                                <p className="font-label text-xs" style={{ color: 'var(--primary)' }}>v2.4.0 (Stable)</p>
                              </div>
                              <div
                                className="p-2 rounded-sm"
                                style={{
                                  background: 'var(--primary)',
                                  color: 'var(--on-primary)',
                                  boxShadow: '0 0 15px rgba(206, 250, 5, 0.4)',
                                }}
                              >
                                <span className="material-symbols-outlined text-sm">check</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Theme Options */}
                        <div className="flex flex-col justify-between py-2">
                          <div className="space-y-6">
                            <div>
                              <p className="font-body font-medium mb-1" style={{ color: 'var(--on-surface)' }}>Obsidian Intensity</p>
                              <p className="font-body text-xs mb-4" style={{ color: 'var(--on-surface-variant)' }}>
                                Adjust the depth of surface shadows and glass transparency.
                              </p>
                              <SettingsSlider
                                value={obsidianIntensity}
                                onChange={setObsidianIntensity}
                                labelLeft="Subtle"
                                labelRight="Monolith"
                              />
                            </div>
                            <div
                              className="flex items-center justify-between p-4 rounded-lg"
                              style={{
                                background: 'var(--surface-container-high)',
                                border: '1px solid rgba(73, 72, 71, 0.15)',
                              }}
                            >
                              <div>
                                <p className="font-body text-sm font-medium" style={{ color: 'var(--on-surface)' }}>Holographic Accents</p>
                                <p className="font-body text-xs" style={{ color: 'var(--on-surface-variant)' }}>Enable light refraction on active elements.</p>
                              </div>
                              <SettingsToggle checked={holoAccents} onChange={setHoloAccents} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </Section>

                    {/* Interface Dynamics */}
                    <Section title="Interface Dynamics">
                      <div className="space-y-0">
                        <SettingRow
                          title="Agentic Auto-Hide"
                          description="Automatically recede the Sidebar and Top Navigation when focus is on primary content canvas."
                          border
                        >
                          <SettingsToggle checked={autoHide} onChange={setAutoHide} />
                        </SettingRow>

                        <SettingRow
                          title="Compact Typography"
                          description="Reduces vertical spacing and font weights for high-density information displays."
                          border
                        >
                          <SettingsSegmented
                            options={[{ id: 'off' as const, label: 'Off' }, { id: 'on' as const, label: 'On' }]}
                            value={compactTypo}
                            onChange={setCompactTypo}
                          />
                        </SettingRow>

                        <SettingRow
                          title="Global Zoom Level"
                          description="Scale the entire monolithic interface across all connected devices."
                        >
                          <div className="flex items-center gap-4">
                            <span className="font-label text-xs" style={{ color: 'var(--on-surface-variant)' }}>80%</span>
                            <SettingsSlider
                              value={zoomLevel}
                              min={80}
                              max={150}
                              onChange={setZoomLevel}
                            />
                            <span className="font-label text-xs" style={{ color: 'var(--primary)' }}>{zoomLevel}%</span>
                          </div>
                        </SettingRow>
                      </div>
                    </Section>
                  </>
                )}

                {activeCategory === 'agents' && (
                  <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Agent Protocols */}
                    <Section title="Agent Protocols">
                      <div className="space-y-4">
                        <div
                          className="p-4 rounded-lg"
                          style={{
                            background: 'var(--surface-container)',
                            borderLeft: '2px solid var(--primary)',
                          }}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <span className="font-label text-xs uppercase" style={{ color: 'var(--primary)' }}>Current Engine</span>
                            <span className="font-label text-[10px]" style={{ color: 'var(--on-surface-variant)' }}>
                              {defaultModel === 'opus' ? 'v4.6-L' : defaultModel === 'sonnet' ? 'v4.6' : 'v4.5'}
                            </span>
                          </div>
                          <p className="font-headline font-bold" style={{ color: 'var(--on-surface)' }}>
                            Claude {defaultModel.charAt(0).toUpperCase() + defaultModel.slice(1)}
                          </p>
                          <p className="font-body text-xs mt-1" style={{ color: 'var(--on-surface-variant)' }}>
                            Specialized for creative engineering and workflow automation.
                          </p>
                        </div>

                        <SettingsSegmented
                          options={[
                            { id: 'haiku' as const, label: 'Haiku' },
                            { id: 'sonnet' as const, label: 'Sonnet' },
                            { id: 'opus' as const, label: 'Opus' },
                          ]}
                          value={defaultModel}
                          onChange={setDefaultModel}
                        />

                        {/* API Key */}
                        <div>
                          <p className="font-body text-sm font-medium mb-2" style={{ color: 'var(--on-surface)' }}>API Key</p>
                          <div className="flex gap-2">
                            <input
                              type="password"
                              value={apiKey}
                              onChange={(e) => setApiKey(e.target.value)}
                              placeholder={apiKeySaved ? 'Saved' : 'sk-ant-...'}
                              aria-label="Anthropic API key"
                              className="flex-1 h-9 px-3 rounded-lg font-body text-xs outline-none transition-colors"
                              style={{
                                background: 'transparent',
                                color: 'var(--on-surface)',
                                borderBottom: '1px solid rgba(73, 72, 71, 0.3)',
                              }}
                              onFocus={(e) => { e.currentTarget.style.borderBottomColor = 'var(--primary)' }}
                              onBlur={(e) => { e.currentTarget.style.borderBottomColor = 'rgba(73, 72, 71, 0.3)' }}
                            />
                            <button
                              onClick={handleSaveApiKey}
                              className="h-9 px-4 rounded-lg font-label text-[10px] uppercase tracking-widest font-bold cursor-pointer hover:brightness-110 transition-all"
                              style={{
                                background: 'var(--primary)',
                                color: 'var(--on-primary)',
                              }}
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      </div>
                    </Section>

                    {/* Safety & Privacy (inline) */}
                    <Section title="Safety & Privacy" accentColor="var(--error)">
                      <div className="space-y-4">
                        <ToggleRow label="Local-Only Processing" checked={localOnly} onChange={setLocalOnly} />
                        <ToggleRow label="Biometric Unlock" checked={biometric} onChange={setBiometric} />
                        <ToggleRow label="Encrypted Telemetry" checked={encryptedTelemetry} onChange={setEncryptedTelemetry} />

                        {/* Nuclear Action */}
                        <div
                          className="mt-4 p-4 rounded-lg"
                          style={{
                            background: 'rgba(185, 41, 2, 0.1)',
                            border: '1px solid rgba(185, 41, 2, 0.2)',
                          }}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="material-symbols-outlined text-sm" style={{ color: 'var(--error)' }}>warning</span>
                            <span className="font-label text-xs font-bold uppercase" style={{ color: 'var(--error)' }}>Nuclear Action</span>
                          </div>
                          <p className="font-body text-[10px] mb-3" style={{ color: 'var(--on-surface-variant)' }}>
                            Wipe all local vault data and disconnect sessions.
                          </p>
                          <button
                            className="font-label text-[10px] font-bold uppercase cursor-pointer"
                            style={{
                              color: 'var(--error)',
                              borderBottom: '1px solid rgba(255, 115, 81, 0.3)',
                              paddingBottom: 2,
                            }}
                          >
                            Initialize Wipe
                          </button>
                        </div>
                      </div>
                    </Section>
                  </section>
                )}

                {activeCategory === 'privacy' && (
                  <Section title="Privacy & Security">
                    <div className="space-y-0">
                      <SettingRow title="Ad Blocking" description="Block ads, trackers, and analytics across all pages." border>
                        <SettingsToggle checked={shieldEnabled} onChange={setShieldEnabled} />
                      </SettingRow>
                      <SettingRow title="Local-Only Processing" description="Process all AI queries on-device when possible." border>
                        <SettingsToggle checked={localOnly} onChange={setLocalOnly} />
                      </SettingRow>
                      <SettingRow title="Biometric Unlock" description="Use fingerprint or face ID to unlock the vault." border>
                        <SettingsToggle checked={biometric} onChange={setBiometric} />
                      </SettingRow>
                      <SettingRow title="Encrypted Telemetry" description="Share anonymized usage data with encryption.">
                        <SettingsToggle checked={encryptedTelemetry} onChange={setEncryptedTelemetry} />
                      </SettingRow>
                    </div>
                  </Section>
                )}

                {activeCategory === 'extensions' && (
                  <Section title="Extensions">
                    <div className="flex items-center justify-center py-12">
                      <div className="text-center">
                        <span className="material-symbols-outlined mb-3 block" style={{ fontSize: 32, color: 'var(--outline)', opacity: 0.4 }}>extension</span>
                        <p className="font-body text-sm" style={{ color: 'var(--outline)' }}>Extension marketplace coming soon.</p>
                      </div>
                    </div>
                  </Section>
                )}

                {activeCategory === 'sync' && (
                  <Section title="Sync & Vault">
                    <div className="space-y-0">
                      <SettingRow title="Auto-archive tabs" description="Archive inactive tabs after a set period." border>
                        <SettingsSegmented
                          options={[
                            { id: '6' as const, label: '6h' },
                            { id: '12' as const, label: '12h' },
                            { id: '24' as const, label: '24h' },
                            { id: '48' as const, label: '48h' },
                            { id: '0' as const, label: 'Never' },
                          ]}
                          value={String(autoArchiveHours) as any}
                          onChange={(v) => setAutoArchiveHours(Number(v))}
                        />
                      </SettingRow>
                    </div>

                    {/* About */}
                    <div className="mt-8 p-4 rounded-lg" style={{ background: 'var(--surface-container)', border: '1px solid rgba(73, 72, 71, 0.1)' }}>
                      <p className="font-headline text-sm font-semibold mb-2" style={{ color: 'var(--on-surface)' }}>About</p>
                      <div className="font-body text-xs space-y-1" style={{ color: 'var(--outline)' }}>
                        <p>Nsty Browser v0.1.0</p>
                        <p>Built with Electron + React + Claude AI</p>
                        <p>Ad blocking powered by Ghostery adblocker engine</p>
                      </div>
                    </div>
                  </Section>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  )
}

function Section({ title, accentColor, children }: { title: string; accentColor?: string; children: React.ReactNode }) {
  return (
    <section
      className="rounded-xl p-8"
      style={{
        background: 'var(--surface-container-low)',
        border: '1px solid rgba(73, 72, 71, 0.1)',
      }}
    >
      <h2 className="font-headline text-xl font-semibold mb-6 flex items-center gap-2">
        <span className="w-1 h-6 rounded-full" style={{ background: accentColor || 'var(--primary)' }} />
        {title}
      </h2>
      {children}
    </section>
  )
}

function SettingRow({
  title,
  description,
  border,
  children,
}: {
  title: string
  description: string
  border?: boolean
  children: React.ReactNode
}) {
  return (
    <div
      className="flex items-center justify-between py-4"
      style={{ borderBottom: border ? '1px solid rgba(73, 72, 71, 0.1)' : 'none' }}
    >
      <div className="max-w-md">
        <h3 className="font-body font-bold" style={{ color: 'var(--on-surface)' }}>{title}</h3>
        <p className="font-body text-sm" style={{ color: 'var(--on-surface-variant)' }}>{description}</p>
      </div>
      <div className="flex-shrink-0 ml-4">{children}</div>
    </div>
  )
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex justify-between items-center">
      <span className="font-body text-sm font-medium" style={{ color: 'var(--on-surface)' }}>{label}</span>
      <SettingsToggle checked={checked} onChange={onChange} />
    </div>
  )
}
