import { describe, it, expect } from 'vitest'

describe('SettingsSlider', () => {
  it('should export SettingsSlider component', async () => {
    const mod = await import('./SettingsSlider')
    expect(mod.SettingsSlider).toBeDefined()
  })
})
