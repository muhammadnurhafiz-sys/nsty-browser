import { describe, it, expect } from 'vitest'

describe('Sidebar', () => {
  it('should export Sidebar component', async () => {
    const mod = await import('./Sidebar')
    expect(mod.Sidebar).toBeDefined()
  })
})
