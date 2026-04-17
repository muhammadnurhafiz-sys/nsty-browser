import { useEffect, useRef } from 'react'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'default' | 'danger'
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'default',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null)
  const lastFocused = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!isOpen) return
    lastFocused.current = document.activeElement as HTMLElement | null
    confirmRef.current?.focus()
    return () => {
      lastFocused.current?.focus()
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCancel()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, onCancel])

  if (!isOpen) return null

  const confirmBackground = tone === 'danger' ? 'var(--error)' : 'var(--primary)'
  const confirmColor = tone === 'danger' ? 'var(--on-error)' : 'var(--on-primary)'

  return (
    <>
      <div
        className="fixed inset-0 fade-in"
        style={{ background: 'var(--surface-overlay-dim)', zIndex: 'var(--z-backdrop)' as unknown as number }}
        onClick={onCancel}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-xl shadow-2xl fade-in"
        style={{
          width: 'min(420px, calc(100vw - 48px))',
          background: 'var(--surface-container-high)',
          border: '1px solid var(--border-subtle)',
          padding: 24,
          zIndex: 'var(--z-modal)' as unknown as number,
        }}
      >
        <h2
          id="confirm-dialog-title"
          className="font-headline"
          style={{ fontSize: 16, fontWeight: 600, marginBottom: message ? 8 : 20 }}
        >
          {title}
        </h2>
        {message && (
          <p
            className="font-body"
            style={{ fontSize: 13, color: 'var(--on-surface-variant)', marginBottom: 20 }}
          >
            {message}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="font-label"
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              background: 'transparent',
              color: 'var(--on-surface-variant)',
              border: '1px solid var(--border-subtle)',
              cursor: 'pointer',
              fontSize: 11,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              fontWeight: 600,
            }}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            ref={confirmRef}
            onClick={onConfirm}
            className="font-label"
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              background: confirmBackground,
              color: confirmColor,
              border: 'none',
              cursor: 'pointer',
              fontSize: 11,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              fontWeight: 700,
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </>
  )
}
