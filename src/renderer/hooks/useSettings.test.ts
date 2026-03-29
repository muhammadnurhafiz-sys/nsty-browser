import { describe, it, expect } from 'vitest'
import { useSettings } from './useSettings'

describe('useSettings', () => {
  it('should export useSettings hook', () => {
    expect(typeof useSettings).toBe('function')
  })
})
