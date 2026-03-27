import { describe, it, expect } from 'vitest'

describe('App', () => {
  it('should export App component', async () => {
    // Full rendering requires Electron context (window.nsty)
    // Validated via integration tests
    const mod = await import('./App')
    expect(mod.App).toBeDefined()
  })
})
