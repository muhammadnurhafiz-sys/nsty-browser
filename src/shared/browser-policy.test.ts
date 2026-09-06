import { describe, expect, it } from 'vitest'
import { normalizeAddress, validateBrowserAction, isShellUrl, persistableTabs } from './browser-policy'

describe('browser boundary policies', () => {
  it('normalizes addresses without turning failed URLs into searches', () => {
    expect(normalizeAddress('example.com')).toBe('https://example.com/')
    expect(normalizeAddress('localhost:3000/test')).toBe('http://localhost:3000/test')
    expect(normalizeAddress('hello world', 'duckduckgo')).toBe('https://duckduckgo.com/?q=hello%20world')
    expect(() => normalizeAddress('javascript:alert(1)')).toThrow()
    expect(() => normalizeAddress('file:///etc/passwd')).toThrow()
  })
  it('requires exact trusted shell origins', () => {
    expect(isShellUrl('app://bundle/index.html')).toBe(true)
    expect(isShellUrl('app://attacker/index.html')).toBe(false)
    expect(isShellUrl('http://localhost:5173.attacker/')).toBe(false)
    expect(isShellUrl('http://localhost:5173/', true)).toBe(true)
    expect(isShellUrl('http://localhost:5173/', false)).toBe(false)
  })
  it('rejects malformed commands before native actions', () => {
    expect(validateBrowserAction({ type: 'zoom', value: 1.25 })).toBe(true)
    expect(validateBrowserAction({ type: 'zoom', value: Infinity })).toBe(false)
    expect(validateBrowserAction({ type: 'preferences', patch: { theme: 'paper' } })).toBe(true)
    expect(validateBrowserAction({ type: 'preferences', patch: { theme: 'unknown' } })).toBe(false)
    expect(validateBrowserAction({ type: 'preferences', patch: { encryptedApiKey: 'x' } })).toBe(false)
    expect(validateBrowserAction({ type: 'permission:respond', id: 'id', allow: true })).toBe(false)
    expect(validateBrowserAction({ type: 'download:open', id: '../../secret' })).toBe(false)
  })
  it('never persists private tabs', () => {
    expect(persistableTabs([{ url: 'https://public.test', space: 'Work', private: false }, { url: 'https://private.test', space: 'Work', private: true }])).toEqual([{ url: 'https://public.test', space: 'Work' }])
  })
})
