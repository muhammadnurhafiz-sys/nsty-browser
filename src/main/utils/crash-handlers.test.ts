import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn().mockReturnValue('/tmp/nsty-test'),
    on: vi.fn(),
  },
}))

import { installCrashHandlers } from './crash-handlers'

describe('installCrashHandlers', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('registers process + app listeners for all four failure modes', () => {
    const processOn = vi.spyOn(process, 'on')
    const appOn = vi.fn()

    installCrashHandlers({ on: appOn } as unknown as Electron.App)

    const processEvents = processOn.mock.calls.map(c => c[0])
    expect(processEvents).toContain('uncaughtException')
    expect(processEvents).toContain('unhandledRejection')

    const appEvents = appOn.mock.calls.map(c => c[0])
    expect(appEvents).toContain('render-process-gone')
    expect(appEvents).toContain('child-process-gone')
  })
})
