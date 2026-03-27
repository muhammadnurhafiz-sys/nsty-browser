import { describe, it, expect } from 'vitest'

describe('TabItem', () => {
  it('should export TabItem component', async () => {
    const mod = await import('./TabItem')
    expect(mod.TabItem).toBeDefined()
  })
})
