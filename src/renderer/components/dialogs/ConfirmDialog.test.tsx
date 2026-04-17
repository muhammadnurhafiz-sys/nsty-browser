import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ConfirmDialog } from './ConfirmDialog'

describe('ConfirmDialog', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <ConfirmDialog
        isOpen={false}
        title="Remove"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders title + message + two labeled buttons when open', () => {
    render(
      <ConfirmDialog
        isOpen
        title="Unpin page"
        message="This will remove the pin from your sidebar."
        confirmLabel="Unpin"
        cancelLabel="Keep"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    expect(screen.getByRole('dialog', { name: /unpin page/i })).toBeDefined()
    expect(screen.getByText(/will remove the pin/i)).toBeDefined()
    expect(screen.getByRole('button', { name: /^unpin$/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /^keep$/i })).toBeDefined()
  })

  it('fires onConfirm when the confirm button is clicked', () => {
    const onConfirm = vi.fn()
    render(
      <ConfirmDialog
        isOpen
        title="Remove"
        confirmLabel="Remove"
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /^remove$/i }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('fires onCancel on Escape key', () => {
    const onCancel = vi.fn()
    render(
      <ConfirmDialog isOpen title="x" onConfirm={vi.fn()} onCancel={onCancel} />,
    )
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})
