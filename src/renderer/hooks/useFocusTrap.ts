import { useEffect, useRef, type RefObject } from 'react'

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

/**
 * Trap Tab/Shift+Tab focus cycling inside `containerRef` while `active` is true,
 * and restore focus to whatever element was focused before activation when it
 * flips back to false. Follows WCAG 2.4.3 (focus order) and 2.1.2 (no keyboard trap
 * — Escape must still be wired by the caller).
 */
export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  active: boolean,
): void {
  const lastFocused = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!active) return
    const container = containerRef.current
    if (!container) return

    lastFocused.current = document.activeElement as HTMLElement | null

    const focusables = container.querySelectorAll<HTMLElement>(FOCUSABLE)
    const first = focusables[0]
    if (first) first.focus()

    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== 'Tab') return
      const nodes = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE))
      if (nodes.length === 0) return
      const firstNode = nodes[0]!
      const lastNode = nodes[nodes.length - 1]!
      const activeEl = document.activeElement as HTMLElement | null

      if (e.shiftKey && activeEl === firstNode) {
        e.preventDefault()
        lastNode.focus()
      } else if (!e.shiftKey && activeEl === lastNode) {
        e.preventDefault()
        firstNode.focus()
      }
    }

    container.addEventListener('keydown', onKey)
    return () => {
      container.removeEventListener('keydown', onKey)
      lastFocused.current?.focus()
    }
  }, [active, containerRef])
}
