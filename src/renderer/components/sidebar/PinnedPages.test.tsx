import { describe, it, expect } from 'vitest'

describe('PinnedPages', () => {
  it('should export PinnedPages component', async () => {
    const mod = await import('./PinnedPages')
    expect(mod.PinnedPages).toBeDefined()
  })
})
