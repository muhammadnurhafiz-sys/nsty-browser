import { describe, it, expect } from 'vitest'

describe('ChatInput', () => {
  it('should export ChatInput component', async () => {
    const mod = await import('./ChatInput')
    expect(mod.ChatInput).toBeDefined()
  })
})
