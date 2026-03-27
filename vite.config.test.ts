import { describe, it, expect } from 'vitest'

describe('vite config', () => {
  it('should export a valid config', async () => {
    const mod = await import('./vite.config')
    expect(mod.default).toBeDefined()
  })
})
