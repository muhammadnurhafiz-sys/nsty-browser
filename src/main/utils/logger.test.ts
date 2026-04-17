import { describe, it, expect } from 'vitest'
import { __testing } from './logger'

const { format } = __testing

describe('logger.format', () => {
  it('emits ISO timestamp, level, module and message', () => {
    const line = format('info', 'shield', 'engine ready')
    expect(line).toMatch(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[INFO\] \[shield\] engine ready$/)
  })

  it('appends JSON context when provided', () => {
    const line = format('error', 'ai', 'stream failed', { code: 500, retry: false })
    expect(line).toContain('[ERROR] [ai] stream failed')
    expect(line).toContain('{"code":500,"retry":false}')
  })

  it('does not append context when omitted', () => {
    const line = format('debug', 'nav-guard', 'ok')
    expect(line.endsWith('ok')).toBe(true)
  })
})
