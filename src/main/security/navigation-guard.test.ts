import { describe, it, expect, vi, beforeEach } from 'vitest'
import { applyNavigationGuard, isAllowedNavigationUrl } from './navigation-guard'

vi.mock('electron', () => ({
  shell: {
    openExternal: vi.fn(() => Promise.resolve()),
  },
}))

describe('isAllowedNavigationUrl', () => {
  it('allows http/https/app schemes', () => {
    expect(isAllowedNavigationUrl('https://example.com/')).toBe(true)
    expect(isAllowedNavigationUrl('http://example.com/')).toBe(true)
    expect(isAllowedNavigationUrl('app://./index.html')).toBe(true)
  })

  it('blocks dangerous schemes', () => {
    expect(isAllowedNavigationUrl('javascript:alert(1)')).toBe(false)
    expect(isAllowedNavigationUrl('file:///etc/passwd')).toBe(false)
    expect(isAllowedNavigationUrl('data:text/html,<script>bad()</script>')).toBe(false)
    expect(isAllowedNavigationUrl('chrome://settings')).toBe(false)
  })
})

describe('applyNavigationGuard', () => {
  function makeWebContents() {
    const handlers: Record<string, (event: { preventDefault: () => void }, url: string) => void> = {}
    let openHandler: ((d: { url: string }) => { action: 'allow' | 'deny' }) | null = null

    return {
      handlers,
      getOpenHandler: () => openHandler,
      wc: {
        on: vi.fn((evt: string, cb: (event: { preventDefault: () => void }, url: string) => void) => {
          handlers[evt] = cb
        }),
        setWindowOpenHandler: vi.fn((cb: (d: { url: string }) => { action: 'allow' | 'deny' }) => {
          openHandler = cb
        }),
      } as unknown as Electron.WebContents,
    }
  }

  beforeEach(() => vi.clearAllMocks())

  it('prevents will-navigate to non-http(s)/app URLs', () => {
    const { wc, handlers } = makeWebContents()
    applyNavigationGuard(wc)
    const evt = { preventDefault: vi.fn() }
    handlers['will-navigate']!(evt, 'javascript:alert(1)')
    expect(evt.preventDefault).toHaveBeenCalled()
  })

  it('allows will-navigate to https URLs', () => {
    const { wc, handlers } = makeWebContents()
    applyNavigationGuard(wc)
    const evt = { preventDefault: vi.fn() }
    handlers['will-navigate']!(evt, 'https://example.com/')
    expect(evt.preventDefault).not.toHaveBeenCalled()
  })

  it('denies all new-window requests but routes https to shell', async () => {
    const { shell } = await import('electron')
    const { wc, getOpenHandler } = makeWebContents()
    applyNavigationGuard(wc)
    const handler = getOpenHandler()!
    const result = handler({ url: 'https://example.com/' })
    expect(result.action).toBe('deny')
    expect(shell.openExternal).toHaveBeenCalledWith('https://example.com/')
  })

  it('denies new-window and does NOT call shell for non-http schemes', async () => {
    const { shell } = await import('electron')
    vi.mocked(shell.openExternal).mockClear()
    const { wc, getOpenHandler } = makeWebContents()
    applyNavigationGuard(wc)
    const handler = getOpenHandler()!
    const result = handler({ url: 'javascript:alert(1)' })
    expect(result.action).toBe('deny')
    expect(shell.openExternal).not.toHaveBeenCalled()
  })
})
