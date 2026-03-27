import { describe, it, expect } from 'vitest'

describe('AiPanel', () => {
  it('should export AiPanel component', async () => {
    const mod = await import('./AiPanel')
    expect(mod.AiPanel).toBeDefined()
  })
})
