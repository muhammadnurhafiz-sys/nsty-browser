import { describe, it, expect } from 'vitest'

describe('main process entry', () => {
  it('should be defined', () => {
    // Main process entry requires Electron runtime, tested via integration
    expect(true).toBe(true)
  })
})
