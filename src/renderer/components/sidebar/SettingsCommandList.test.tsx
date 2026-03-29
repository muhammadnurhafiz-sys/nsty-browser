import { describe, it, expect } from 'vitest'
import { SettingsCommandList } from './SettingsCommandList'

describe('SettingsCommandList', () => {
  it('should export SettingsCommandList component', () => {
    expect(typeof SettingsCommandList).toBe('function')
  })
})
