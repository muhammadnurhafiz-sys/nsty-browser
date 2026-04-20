import { describe, it, expect } from 'vitest'

describe('ShieldButton', () => {
  it('should export ShieldButton component', async () => {
    const mod = await import('./ShieldButton')
    expect(mod.ShieldButton).toBeDefined()
  })
})
