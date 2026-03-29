import { describe, it, expect } from 'vitest'
import { Dashboard } from './Dashboard'

describe('Dashboard', () => {
  it('should export Dashboard component', () => {
    expect(typeof Dashboard).toBe('function')
  })
})
