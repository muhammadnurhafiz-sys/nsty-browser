import { describe, it, expect } from 'vitest'

describe('SpaceSwitcher', () => {
  it('should export SpaceSwitcher component', async () => {
    const mod = await import('./SpaceSwitcher')
    expect(mod.SpaceSwitcher).toBeDefined()
  })
})
