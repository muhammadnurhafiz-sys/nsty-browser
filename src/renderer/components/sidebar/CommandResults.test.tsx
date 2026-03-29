import { describe, it, expect } from 'vitest'
import { CommandResults } from './CommandResults'

describe('CommandResults', () => {
  it('should export CommandResults component', () => {
    expect(typeof CommandResults).toBe('function')
  })
})
