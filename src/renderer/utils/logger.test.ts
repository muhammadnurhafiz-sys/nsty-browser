import { describe, it, expect } from 'vitest'
import { __testing } from './logger'

const { format } = __testing

describe('renderer logger.format', () => {
  it('emits level, module, and message prefix', () => {
    expect(format('warn', 'App', 'boundary triggered')).toBe('[WARN] [App] boundary triggered')
  })

  it('appends JSON context', () => {
    const line = format('error', 'useAi', 'api unreachable', { status: 503 })
    expect(line).toBe('[ERROR] [useAi] api unreachable {"status":503}')
  })
})
