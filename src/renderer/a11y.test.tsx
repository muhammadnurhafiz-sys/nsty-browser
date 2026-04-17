import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { axe } from 'vitest-axe'
import { SkipToContent } from './components/SkipToContent'
import { ConfirmDialog } from './components/dialogs/ConfirmDialog'
import { ErrorBoundary } from './components/ErrorBoundary'

afterEach(() => cleanup())

describe('axe smoke — shared UI primitives', () => {
  it('SkipToContent has no a11y violations', async () => {
    const { container } = render(<SkipToContent />)
    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })

  it('ConfirmDialog (open) has no a11y violations', async () => {
    const { container } = render(
      <ConfirmDialog
        isOpen
        title="Remove item?"
        message="This cannot be undone."
        confirmLabel="Remove"
        cancelLabel="Keep"
        tone="danger"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })

  it('ErrorBoundary fallback has no a11y violations', async () => {
    const Bomb = (): never => {
      throw new Error('boom')
    }
    // Suppress React's expected error log for the throwing child.
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const { container } = render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    )
    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })
})
