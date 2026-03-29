import { describe, it, expect } from 'vitest'
import { QuickAccessCard } from './QuickAccessCard'

describe('QuickAccessCard', () => {
  it('should export QuickAccessCard component', () => {
    expect(typeof QuickAccessCard).toBe('function')
  })
})
