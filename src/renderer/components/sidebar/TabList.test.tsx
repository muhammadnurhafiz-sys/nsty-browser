import { describe, it, expect } from 'vitest'

describe('TabList', () => {
  it('should export TabList component', async () => {
    const mod = await import('./TabList')
    expect(mod.TabList).toBeDefined()
  })
})
