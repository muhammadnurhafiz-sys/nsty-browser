import { describe, it, expect } from 'vitest'

describe('HistoryPanel', () => {
  it('should export HistoryPanel component', async () => {
    const mod = await import('./HistoryPanel')
    expect(mod.HistoryPanel).toBeDefined()
  })
})
