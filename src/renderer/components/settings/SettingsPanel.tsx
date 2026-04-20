import { useEffect, useRef, useState } from 'react'
import type { UserProfile } from '@shared/types'
import { SettingsToggle } from './SettingsToggle'
import { useFocusTrap } from '../../hooks/useFocusTrap'
import { createLogger } from '../../utils/logger'

const log = createLogger('SettingsPanel')

interface SettingsPanelProps {
  isOpen: boolean
  onClose: () => void
  userProfile: UserProfile
}

type Section = 'general' | 'appearance' | 'shield' | 'about'

const SECTIONS: { id: Section; label: string; icon: string }[] = [
  { id: 'general', label: 'General', icon: 'tune' },
  { id: 'appearance', label: 'Appearance', icon: 'palette' },
  { id: 'shield', label: 'Shield', icon: 'shield' },
  { id: 'about', label: 'About', icon: 'info' },
]

export function SettingsPanel({ isOpen, onClose, userProfile }: SettingsPanelProps) {
  log.debug('render', { isOpen })
  const [section, setSection] = useState<Section>('general')
  const [shieldEnabled, setShieldEnabled] = useState(true)
  const [autoUpdate, setAutoUpdate] = useState(true)
  const [reduceMotion, setReduceMotion] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  useFocusTrap(panelRef, isOpen)

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        log.debug('escape close')
        e.preventDefault()
        onClose()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <>
      <div
        className="fixed inset-0 z-[var(--z-backdrop)] settings-backdrop"
        style={{ background: 'var(--surface-overlay-dim)' }}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        className="fixed inset-6 z-[var(--z-modal)] flex overflow-hidden settings-panel"
        style={{
          background: 'var(--surface-container)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-card-elevated)',
        }}
      >
        {/* Nav rail */}
        <aside
          className="flex flex-col flex-shrink-0"
          style={{
            width: 220,
            borderRight: '1px solid var(--border-subtle)',
            padding: 'var(--menu-pad)',
          }}
        >
          <div
            className="flex items-center justify-between px-3 pt-4 pb-3"
          >
            <div
              className="font-headline text-sm font-semibold"
              style={{ color: 'var(--on-surface)', letterSpacing: '-0.01em' }}
            >
              Settings
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close settings"
              className="w-6 h-6 rounded-md flex items-center justify-center cursor-pointer hover-surface"
              style={{ color: 'var(--on-surface-variant)' }}
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
          <nav className="flex flex-col gap-1">
            {SECTIONS.map(s => {
              const active = s.id === section
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSection(s.id)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer text-left font-body text-xs"
                  style={{
                    background: active ? 'var(--surface-translucent-active)' : 'transparent',
                    color: active ? 'var(--on-surface)' : 'var(--on-surface-variant)',
                  }}
                >
                  <span className="material-symbols-outlined text-[16px]" aria-hidden="true">{s.icon}</span>
                  {s.label}
                </button>
              )
            })}
          </nav>
        </aside>

        {/* Body */}
        <div className="flex-1 overflow-y-auto" style={{ padding: '40px 48px' }}>
          {section === 'general' && (
            <GeneralSection
              userProfile={userProfile}
              autoUpdate={autoUpdate}
              onAutoUpdateChange={setAutoUpdate}
            />
          )}
          {section === 'appearance' && (
            <AppearanceSection
              reduceMotion={reduceMotion}
              onReduceMotionChange={setReduceMotion}
            />
          )}
          {section === 'shield' && (
            <ShieldSection enabled={shieldEnabled} onEnabledChange={setShieldEnabled} />
          )}
          {section === 'about' && <AboutSection />}
        </div>
      </div>
    </>
  )
}

function GeneralSection({ userProfile, autoUpdate, onAutoUpdateChange }: { userProfile: UserProfile; autoUpdate: boolean; onAutoUpdateChange: (v: boolean) => void }) {
  log.debug('GeneralSection')
  return (
    <div className="flex flex-col gap-10">
      <SectionHeader title="General" subtitle="Your profile and app-wide preferences." />
      <SettingsRow
        label="Account"
        description={userProfile.name ? `Signed in as ${userProfile.name}` : 'Local-only profile'}
      >
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center"
          style={{ background: 'var(--surface-translucent-active)', border: '1px solid var(--border-subtle)' }}
        >
          <span className="font-headline text-[11px] font-bold" style={{ color: 'var(--primary-hot)' }}>
            {userProfile.name?.charAt(0)?.toUpperCase() || '?'}
          </span>
        </div>
      </SettingsRow>
      <SettingsRow
        label="Auto-update"
        description="Download and install new versions in the background."
      >
        <SettingsToggle checked={autoUpdate} onChange={onAutoUpdateChange} />
      </SettingsRow>
    </div>
  )
}

function AppearanceSection({ reduceMotion, onReduceMotionChange }: { reduceMotion: boolean; onReduceMotionChange: (v: boolean) => void }) {
  log.debug('AppearanceSection')
  return (
    <div className="flex flex-col gap-10">
      <SectionHeader title="Appearance" subtitle="Theme, motion, and visual density." />
      <SettingsRow label="Theme" description="Obsidian Monolith (dark only for now).">
        <span
          className="font-mono text-[11px] px-2 py-1 rounded-md"
          style={{ background: 'var(--surface-container-highest)', color: 'var(--on-surface-variant)' }}
        >
          Dark
        </span>
      </SettingsRow>
      <SettingsRow
        label="Reduce motion"
        description="Disable perpetual animations and transitions."
      >
        <SettingsToggle checked={reduceMotion} onChange={onReduceMotionChange} />
      </SettingsRow>
    </div>
  )
}

function ShieldSection({ enabled, onEnabledChange }: { enabled: boolean; onEnabledChange: (v: boolean) => void }) {
  log.debug('ShieldSection')
  return (
    <div className="flex flex-col gap-10">
      <SectionHeader title="Shield" subtitle="Ad and tracker blocking powered by Ghostery's adblocker engine." />
      <SettingsRow
        label="Shield protection"
        description="Blocks ads, trackers, and third-party scripts on every site."
      >
        <SettingsToggle checked={enabled} onChange={onEnabledChange} />
      </SettingsRow>
      <SettingsRow label="Lists" description="easylist · ghostery-tracking · nsty-extra">
        <span
          className="font-mono text-[11px] px-2 py-1 rounded-md"
          style={{ background: 'var(--surface-container-highest)', color: 'var(--on-surface-variant)' }}
        >
          3 loaded
        </span>
      </SettingsRow>
    </div>
  )
}

function AboutSection() {
  log.debug('AboutSection')
  const version = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '—'
  return (
    <div className="flex flex-col gap-10">
      <SectionHeader title="About" subtitle="Build and origin." />
      <SettingsRow label="Version">
        <span className="font-mono text-[11px]" style={{ color: 'var(--on-surface)' }}>{version}</span>
      </SettingsRow>
      <SettingsRow label="Engine">
        <span className="font-mono text-[11px]" style={{ color: 'var(--on-surface-variant)' }}>Electron · Chromium</span>
      </SettingsRow>
    </div>
  )
}

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  log.debug('SectionHeader', { title })
  return (
    <div>
      <h2
        className="font-headline font-medium"
        style={{ color: 'var(--on-surface)', fontSize: 22, letterSpacing: '-0.02em', marginBottom: 4 }}
      >
        {title}
      </h2>
      <p className="font-body text-xs" style={{ color: 'var(--on-surface-variant)', maxWidth: '48ch' }}>
        {subtitle}
      </p>
    </div>
  )
}

function SettingsRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  log.debug('SettingsRow', { label })
  return (
    <div
      className="flex items-center justify-between gap-6 py-4"
      style={{ borderTop: '1px solid var(--border-subtle)' }}
    >
      <div>
        <div className="font-body text-sm" style={{ color: 'var(--on-surface)', marginBottom: 2 }}>
          {label}
        </div>
        {description && (
          <div className="font-body text-[11px]" style={{ color: 'var(--on-surface-variant)', maxWidth: '52ch' }}>
            {description}
          </div>
        )}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  )
}
