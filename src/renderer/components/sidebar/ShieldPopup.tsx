import { useEffect, useRef } from 'react'
import type { ShieldStats } from '@shared/types'
import { useFocusTrap } from '../../hooks/useFocusTrap'
import { createLogger } from '../../utils/logger'

const log = createLogger('ShieldPopup')

interface ShieldPopupProps {
  stats: ShieldStats
  isOpen: boolean
  onClose: () => void
  onDisableForSite: () => void
}

export function ShieldPopup({ stats, isOpen, onClose, onDisableForSite }: ShieldPopupProps) {
  log.debug('render', { isOpen })
  const popupRef = useRef<HTMLDivElement>(null)
  useFocusTrap(popupRef, isOpen)

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
      {/* Backdrop */}
      <div className="fixed inset-0 z-[var(--z-backdrop)]" onClick={onClose} aria-hidden="true" />

      {/* Popup */}
      <div
        ref={popupRef}
        className="absolute right-0 top-10 z-[var(--z-drawer)] w-60 rounded-xl shadow-2xl glass-panel fade-in"
        style={{ padding: 'var(--menu-pad)' }}
        role="dialog"
        aria-modal="true"
        aria-label="Shield statistics"
      >
        {/* Header */}
        <div className="flex items-center gap-2.5" style={{ padding: 'var(--menu-item-pad-y) var(--menu-item-pad-x)' }}>
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--command-bar-border)' }}
          >
            <span className="material-symbols-outlined text-[18px]" style={{ color: 'var(--primary)' }}>shield</span>
          </div>
          <div>
            <div className="font-headline text-sm font-semibold" style={{ color: 'var(--on-surface)' }}>
              Nsty Shield
            </div>
            <div
              className="font-label text-[10px] uppercase tracking-wider inline-flex items-center gap-1.5"
              style={{ color: 'var(--primary)' }}
            >
              <span className="pulse-dot" aria-hidden="true" />
              Active
            </div>
          </div>
        </div>

        <hr className="menu-separator" />

        {/* Stats */}
        <div className="flex flex-col" style={{ padding: '0 var(--menu-item-pad-x)' }}>
          <StatRow label="Ads blocked" value={stats.adsBlocked} first />
          <StatRow label="Trackers blocked" value={stats.trackersBlocked} />
          <StatRow label="Data saved" value={formatBytes(stats.bytesSaved)} />
        </div>

        <hr className="menu-separator" />

        {/* Actions */}
        <div className="flex gap-2" style={{ padding: 'var(--menu-pad) var(--menu-item-pad-x) 2px' }}>
          <button
            type="button"
            onClick={onDisableForSite}
            className="flex-1 py-1.5 text-center rounded-lg font-label text-[10px] uppercase tracking-wider cursor-pointer hover:bg-white/10 transition-colors"
            style={{
              background: 'var(--surface-container-high)',
              color: 'var(--on-surface-variant)',
              border: '1px solid rgba(73, 72, 71, 0.15)',
            }}
          >
            Disable
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-1.5 text-center rounded-lg font-label text-[10px] uppercase tracking-wider cursor-pointer hover:brightness-110 transition-[filter] duration-150 ease-out"
            style={{
              background: 'var(--primary)',
              color: 'var(--on-primary)',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </>
  )
}

function StatRow({ label, value, first }: { label: string; value: number | string; first?: boolean }) {
  log.debug('StatRow', { label })
  const borderStyle = first ? undefined : { borderTop: '1px solid var(--border-subtle)' }
  return (
    <div className="flex justify-between py-2" style={borderStyle}>
      <span className="font-body text-[11px]" style={{ color: 'var(--on-surface-variant)' }}>{label}</span>
      <span className="font-mono text-[11px] font-medium tabular-nums" style={{ color: 'var(--on-surface)' }}>{value}</span>
    </div>
  )
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}
