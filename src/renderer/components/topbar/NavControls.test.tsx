import { describe, it, expect } from 'vitest'

describe('topbar NavControls', () => {
  it('should export NavControls component', async () => {
    const mod = await import('./NavControls')
    expect(mod.NavControls).toBeDefined()
  })
})
