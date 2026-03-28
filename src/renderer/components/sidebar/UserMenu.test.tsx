import { describe, it, expect } from 'vitest'

describe('UserMenu', () => {
  it('should export UserMenu component', async () => {
    const mod = await import('./UserMenu')
    expect(mod.UserMenu).toBeDefined()
  })
})
