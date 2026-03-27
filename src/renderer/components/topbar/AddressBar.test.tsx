import { describe, it, expect } from 'vitest'

describe('AddressBar', () => {
  it('should export AddressBar component', async () => {
    const mod = await import('./AddressBar')
    expect(mod.AddressBar).toBeDefined()
  })
})
