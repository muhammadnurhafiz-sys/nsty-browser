import { describe, it, expect } from 'vitest'

describe('TabDrawer', () => {
  it('should export TabDrawer component', async () => {
    const mod = await import('./TabDrawer')
    expect(mod.TabDrawer).toBeDefined()
  })
})
