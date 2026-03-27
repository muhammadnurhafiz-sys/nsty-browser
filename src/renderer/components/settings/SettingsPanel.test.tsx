import { describe, it, expect } from 'vitest'

describe('SettingsPanel', () => {
  it('should export SettingsPanel component', async () => {
    const mod = await import('./SettingsPanel')
    expect(mod.SettingsPanel).toBeDefined()
  })
})
