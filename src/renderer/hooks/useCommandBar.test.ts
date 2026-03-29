import { describe, it, expect } from 'vitest'
import { detectMode, extractAiQuery, extractSettingsFilter, resolveNavigation } from './useCommandBar'

describe('useCommandBar', () => {
  describe('detectMode', () => {
    it('returns ai for @claude prefix with space', () => {
      expect(detectMode('@claude hello')).toBe('ai')
    })

    it('returns ai for exact @claude', () => {
      expect(detectMode('@claude')).toBe('ai')
    })

    it('returns null for bare @ (not @claude)', () => {
      expect(detectMode('@someone')).toBeNull()
    })

    it('returns null for email-like input', () => {
      expect(detectMode('user@example.com')).toBeNull()
    })

    it('returns settings for /settings prefix with space', () => {
      expect(detectMode('/settings zoom')).toBe('settings')
    })

    it('returns settings for exact /settings', () => {
      expect(detectMode('/settings')).toBe('settings')
    })

    it('returns null for URL paths starting with /', () => {
      expect(detectMode('/api/v1/users')).toBeNull()
    })

    it('returns null for regular text', () => {
      expect(detectMode('google.com')).toBeNull()
    })

    it('returns null for empty string', () => {
      expect(detectMode('')).toBeNull()
    })
  })

  describe('extractAiQuery', () => {
    it('strips @claude prefix', () => {
      expect(extractAiQuery('@claude hello world')).toBe('hello world')
    })

    it('handles @claude with no message', () => {
      expect(extractAiQuery('@claude')).toBe('')
    })

    it('handles @claude with extra spaces', () => {
      expect(extractAiQuery('@claude   hello')).toBe('hello')
    })

    it('extracts model switching command', () => {
      expect(extractAiQuery('@claude /opus')).toBe('/opus')
    })
  })

  describe('extractSettingsFilter', () => {
    it('strips /settings prefix', () => {
      expect(extractSettingsFilter('/settings zoom')).toBe('zoom')
    })

    it('handles /settings with no filter', () => {
      expect(extractSettingsFilter('/settings')).toBe('')
    })

    it('handles /settings with extra spaces', () => {
      expect(extractSettingsFilter('/settings   ad blocking')).toBe('ad blocking')
    })
  })

  describe('resolveNavigation', () => {
    it('returns empty for empty input', () => {
      expect(resolveNavigation('')).toBe('')
      expect(resolveNavigation('   ')).toBe('')
    })

    it('prepends https:// to bare domain', () => {
      expect(resolveNavigation('google.com')).toBe('https://google.com')
    })

    it('keeps http:// URLs as-is', () => {
      expect(resolveNavigation('http://example.com')).toBe('http://example.com')
    })

    it('keeps https:// URLs as-is', () => {
      expect(resolveNavigation('https://github.com')).toBe('https://github.com')
    })

    it('treats input with spaces as search query', () => {
      expect(resolveNavigation('hello world')).toBe(
        'https://www.google.com/search?q=hello%20world'
      )
    })

    it('treats input without dots as search query', () => {
      expect(resolveNavigation('react hooks')).toBe(
        'https://www.google.com/search?q=react%20hooks'
      )
    })

    it('handles subdomain URLs', () => {
      expect(resolveNavigation('docs.github.com')).toBe('https://docs.github.com')
    })

    it('handles URL with path', () => {
      expect(resolveNavigation('https://example.com/path')).toBe('https://example.com/path')
    })
  })
})
