import { describe, it, expect } from 'vitest'

describe('useSpaces', () => {
  it('should export useSpaces hook', async () => {
    const mod = await import('./useSpaces')
    expect(mod.useSpaces).toBeDefined()
  })
})
