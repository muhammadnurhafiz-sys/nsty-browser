import { describe, it, expect } from 'vitest'
import { CommandBar } from './CommandBar'

describe('CommandBar', () => {
  it('should export CommandBar component', () => {
    expect(typeof CommandBar).toBe('function')
  })
})
