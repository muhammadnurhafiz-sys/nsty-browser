import { describe, it, expect } from 'vitest'

describe('ChatMessage', () => {
  it('should export ChatMessage component', async () => {
    const mod = await import('./ChatMessage')
    expect(mod.ChatMessage).toBeDefined()
  })
})
