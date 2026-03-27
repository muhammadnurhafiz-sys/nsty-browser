import { describe, it, expect } from 'vitest'

describe('SidebarMini', () => {
  it('should export SidebarMini component', async () => {
    const mod = await import('./SidebarMini')
    expect(mod.SidebarMini).toBeDefined()
  })
})
