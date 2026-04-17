import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useReducedMotion } from './useReducedMotion'

function mockMatchMedia(matches: boolean): void {
  vi.stubGlobal('matchMedia', (_q: string) => ({
    matches,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    onchange: null,
    media: _q,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}

describe('useReducedMotion', () => {
  it('returns true when prefers-reduced-motion is active', () => {
    mockMatchMedia(true)
    const { result } = renderHook(() => useReducedMotion())
    expect(result.current).toBe(true)
    vi.unstubAllGlobals()
  })

  it('returns false when prefers-reduced-motion is not set', () => {
    mockMatchMedia(false)
    const { result } = renderHook(() => useReducedMotion())
    expect(result.current).toBe(false)
    vi.unstubAllGlobals()
  })
})
