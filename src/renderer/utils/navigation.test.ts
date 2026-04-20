import { describe, it, expect } from 'vitest'
import { resolveNavigation } from './navigation'

describe('resolveNavigation', () => {
  it('returns empty string for empty input', () => {
    expect(resolveNavigation('')).toBe('')
    expect(resolveNavigation('   ')).toBe('')
  })

  it('adds https:// to bare domains', () => {
    expect(resolveNavigation('example.com')).toBe('https://example.com')
  })

  it('preserves absolute URLs', () => {
    expect(resolveNavigation('https://example.com/foo')).toBe('https://example.com/foo')
    expect(resolveNavigation('http://example.com')).toBe('http://example.com')
  })

  it('routes free-text queries to Google search', () => {
    expect(resolveNavigation('best coffee in berlin'))
      .toBe('https://www.google.com/search?q=best%20coffee%20in%20berlin')
  })
})
