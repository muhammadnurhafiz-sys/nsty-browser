import { describe, it, expect } from 'vitest'

describe('SettingsSegmented', () => {
  it('should export SettingsSegmented component', async () => {
    const mod = await import('./SettingsSegmented')
    expect(mod.SettingsSegmented).toBeDefined()
  })
})
