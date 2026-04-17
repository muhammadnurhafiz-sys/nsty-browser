import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useRef } from 'react'
import { useFocusTrap } from './useFocusTrap'

function setupContainer(): { container: HTMLDivElement; first: HTMLButtonElement; last: HTMLButtonElement } {
  const container = document.createElement('div')
  const first = document.createElement('button')
  first.textContent = 'first'
  const middle = document.createElement('input')
  const last = document.createElement('button')
  last.textContent = 'last'
  container.append(first, middle, last)
  document.body.appendChild(container)
  return { container, first, last }
}

describe('useFocusTrap', () => {
  it('focuses the first focusable element when active', () => {
    const { container, first } = setupContainer()
    renderHook(() => {
      const ref = useRef(container)
      useFocusTrap(ref, true)
    })
    expect(document.activeElement).toBe(first)
    container.remove()
  })

  it('cycles from last → first on Tab', () => {
    const { container, first, last } = setupContainer()
    renderHook(() => {
      const ref = useRef(container)
      useFocusTrap(ref, true)
    })
    last.focus()
    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })
    container.dispatchEvent(event)
    expect(document.activeElement).toBe(first)
    container.remove()
  })

  it('cycles from first → last on Shift+Tab', () => {
    const { container, first, last } = setupContainer()
    renderHook(() => {
      const ref = useRef(container)
      useFocusTrap(ref, true)
    })
    first.focus()
    const event = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true })
    container.dispatchEvent(event)
    expect(document.activeElement).toBe(last)
    container.remove()
  })

  it('does nothing when inactive', () => {
    const { container } = setupContainer()
    const prior = document.createElement('button')
    document.body.appendChild(prior)
    prior.focus()
    renderHook(() => {
      const ref = useRef(container)
      useFocusTrap(ref, false)
    })
    // Should not have stolen focus from `prior`.
    expect(document.activeElement).toBe(prior)
    container.remove()
    prior.remove()
  })
})
