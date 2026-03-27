import { describe, it, expect } from 'vitest'

describe('ShieldPopup', () => {
  it('should export ShieldPopup component', async () => {
    const mod = await import('./ShieldPopup')
    expect(mod.ShieldPopup).toBeDefined()
  })
})
