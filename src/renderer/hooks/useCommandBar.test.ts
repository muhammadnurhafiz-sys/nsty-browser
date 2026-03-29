import { describe, it, expect } from 'vitest'
import { useCommandBar } from './useCommandBar'

describe('useCommandBar', () => {
  it('should export useCommandBar hook', () => {
    expect(typeof useCommandBar).toBe('function')
  })
})
