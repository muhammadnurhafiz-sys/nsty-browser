import { describe, it, expect } from 'vitest'

describe('ModelSelector', () => {
  it('should export ModelSelector component', async () => {
    const mod = await import('./ModelSelector')
    expect(mod.ModelSelector).toBeDefined()
  })
})
