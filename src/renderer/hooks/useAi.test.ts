import { describe, it, expect } from 'vitest'

describe('useAi', () => {
  it('should export useAi hook', async () => {
    const mod = await import('./useAi')
    expect(mod.useAi).toBeDefined()
  })
})
