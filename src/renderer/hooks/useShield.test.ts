import { describe, it, expect } from 'vitest'

describe('useShield', () => {
  it('should export useShield hook', async () => {
    const mod = await import('./useShield')
    expect(mod.useShield).toBeDefined()
  })
})
