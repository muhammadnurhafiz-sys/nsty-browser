import { describe, it, expect } from 'vitest'
import { useUserProfile } from './useUserProfile'

// Simple test that verifies the hook returns expected shape
// (hook must be called inside a component, but we can test the module exports)
describe('useUserProfile', () => {
  it('exports useUserProfile function', () => {
    expect(typeof useUserProfile).toBe('function')
  })
})
