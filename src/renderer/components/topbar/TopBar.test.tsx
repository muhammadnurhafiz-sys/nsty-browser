import { describe, it, expect } from 'vitest'

describe('TopBar', () => {
  it('should export TopBar component', async () => {
    const mod = await import('./TopBar')
    expect(mod.TopBar).toBeDefined()
  })
})
