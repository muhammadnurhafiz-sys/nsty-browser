import { describe, it, expect, vi } from 'vitest'
import { installCsp, buildCspPolicy } from './csp'

describe('buildCspPolicy', () => {
  it('emits a production policy without unsafe-eval or localhost', () => {
    const policy = buildCspPolicy(false)
    expect(policy).toContain("default-src 'self' app:")
    expect(policy).toContain("script-src 'self' app:")
    expect(policy).toContain('https://api.anthropic.com')
    expect(policy).toContain("object-src 'none'")
    expect(policy).toContain("frame-ancestors 'none'")
    expect(policy).not.toContain("'unsafe-eval'")
    expect(policy).not.toContain('localhost')
  })

  it('adds Vite HMR allowances in dev mode', () => {
    const policy = buildCspPolicy(true)
    expect(policy).toContain("'unsafe-eval'")
    expect(policy).toContain('ws://localhost:5173')
    expect(policy).toContain('http://localhost:5173')
  })

  it('denies frame embedding in both modes', () => {
    expect(buildCspPolicy(false)).toContain("frame-ancestors 'none'")
    expect(buildCspPolicy(true)).toContain("frame-ancestors 'none'")
  })
})

describe('installCsp', () => {
  it('registers a response-header callback that adds CSP', () => {
    const onHeadersReceived = vi.fn()
    const session = { webRequest: { onHeadersReceived } } as unknown as Electron.Session

    installCsp(session, false)

    expect(onHeadersReceived).toHaveBeenCalledTimes(1)
    const callback = onHeadersReceived.mock.calls[0][0] as (
      details: { responseHeaders?: Record<string, string[]> },
      cb: (result: { responseHeaders: Record<string, string[]> }) => void,
    ) => void

    const result = vi.fn()
    callback({ responseHeaders: { 'x-frame-options': ['DENY'] } }, result)
    expect(result).toHaveBeenCalledTimes(1)
    const emittedHeaders = result.mock.calls[0][0].responseHeaders
    expect(emittedHeaders['Content-Security-Policy']).toBeDefined()
    expect(emittedHeaders['Content-Security-Policy'][0]).toContain("default-src 'self'")
    expect(emittedHeaders['x-frame-options']).toEqual(['DENY'])
  })

  it('overwrites any pre-existing CSP header on the response', () => {
    const onHeadersReceived = vi.fn()
    const session = { webRequest: { onHeadersReceived } } as unknown as Electron.Session

    installCsp(session, false)
    const callback = onHeadersReceived.mock.calls[0][0] as (
      details: { responseHeaders?: Record<string, string[]> },
      cb: (result: { responseHeaders: Record<string, string[]> }) => void,
    ) => void

    const result = vi.fn()
    callback({ responseHeaders: { 'Content-Security-Policy': ["default-src *"] } }, result)
    const emitted = result.mock.calls[0][0].responseHeaders
    // Original permissive policy was dropped in favor of ours.
    expect(emitted['Content-Security-Policy'][0]).not.toBe('default-src *')
    expect(emitted['Content-Security-Policy'][0]).toContain("default-src 'self'")
  })
})
