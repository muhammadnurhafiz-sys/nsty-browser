import { useState } from 'react'

interface SettingsPanelProps {
  isOpen: boolean
  onClose: () => void
}

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const [apiKey, setApiKey] = useState('')
  const [apiKeySaved, setApiKeySaved] = useState(false)
  const [defaultModel, setDefaultModel] = useState<'sonnet' | 'haiku' | 'opus'>('sonnet')
  const [shieldEnabled, setShieldEnabled] = useState(true)
  const [autoArchiveHours, setAutoArchiveHours] = useState(12)

  const handleSaveApiKey = () => {
    if (!apiKey.trim()) return
    // @ts-expect-error - custom IPC
    window.nsty?.sendAiMessage && window.nsty
    // Send to main process to encrypt and save
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
      <div className="settings-backdrop fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div
        className="settings-panel fixed top-1/2 left-1/2 z-50 w-[500px] max-h-[70vh] flex flex-col shadow-2xl overflow-hidden"
        style={{
          background: 'var(--bg-sidebar)',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius-lg)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Settings
          </span>
          <button
            onClick={onClose}
            className="text-sm cursor-pointer"
            style={{ color: 'var(--text-muted)' }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">

          {/* Claude AI Section */}
          <SettingsSection title="Claude AI">
            <SettingsRow label="API Key" description="Your Anthropic API key (encrypted locally)">
              <div className="flex gap-2">
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={apiKeySaved ? '✓ Saved' : 'sk-ant-...'}
                  className="flex-1 h-7 px-2 rounded-md text-xs outline-none"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border)',
                  }}
                />
                <button
                  onClick={handleSaveApiKey}
                  className="h-7 px-3 rounded-md text-xs cursor-pointer"
                  style={{
                    background: 'var(--accent)',
                    color: 'white',
                  }}
                >
                  Save
                </button>
              </div>
            </SettingsRow>

            <SettingsRow label="Default Model" description="Which Claude model to use by default">
              <select
                value={defaultModel}
                onChange={(e) => setDefaultModel(e.target.value as typeof defaultModel)}
                className="h-7 px-2 rounded-md text-xs outline-none cursor-pointer"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border)',
                }}
              >
                <option value="sonnet">Sonnet (Balanced)</option>
                <option value="haiku">Haiku (Fast)</option>
                <option value="opus">Opus (Deep analysis)</option>
              </select>
            </SettingsRow>
          </SettingsSection>

          {/* Shield Section */}
          <SettingsSection title="Nsty Shield">
            <SettingsRow label="Ad Blocking" description="Block ads, trackers, and analytics">
              <ToggleSwitch checked={shieldEnabled} onChange={setShieldEnabled} />
            </SettingsRow>
          </SettingsSection>

          {/* Browser Section */}
          <SettingsSection title="Browser">
            <SettingsRow label="Auto-archive tabs" description="Archive inactive tabs after this many hours">
              <select
                value={autoArchiveHours}
                onChange={(e) => setAutoArchiveHours(Number(e.target.value))}
                className="h-7 px-2 rounded-md text-xs outline-none cursor-pointer"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border)',
                }}
              >
                <option value={6}>6 hours</option>
                <option value={12}>12 hours</option>
                <option value={24}>24 hours</option>
                <option value={48}>48 hours</option>
                <option value={0}>Never</option>
              </select>
            </SettingsRow>
          </SettingsSection>

          {/* About */}
          <SettingsSection title="About">
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
              <p>Nsty Browser v0.1.0</p>
              <p className="mt-1">Built with Electron + React + Claude AI</p>
              <p className="mt-1">Ad blocking powered by Ghostery adblocker engine</p>
            </div>
          </SettingsSection>
        </div>
      </div>
    </>
  )
}

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3
        className="text-[11px] font-semibold uppercase tracking-wider mb-2"
        style={{ color: 'var(--text-muted)' }}
      >
        {title}
      </h3>
      <div
        className="rounded-lg flex flex-col divide-y"
        style={{
          background: 'rgba(255,255,255,0.03)',
          borderColor: 'var(--border)',
        }}
      >
        {children}
      </div>
    </div>
  )
}

function SettingsRow({
  label,
  description,
  children,
}: {
  label: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between px-3 py-2.5" style={{ borderColor: 'var(--border)' }}>
      <div>
        <div className="text-xs" style={{ color: 'var(--text-primary)' }}>{label}</div>
        <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{description}</div>
      </div>
      <div className="flex-shrink-0 ml-4">{children}</div>
    </div>
  )
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="w-9 h-5 rounded-full relative cursor-pointer transition-colors"
      style={{ background: checked ? 'var(--accent)' : 'rgba(255,255,255,0.15)' }}
    >
      <div
        className="w-3.5 h-3.5 rounded-full absolute top-[3px] transition-all"
        style={{
          background: 'white',
          left: checked ? 18 : 3,
        }}
      />
    </button>
  )
}
