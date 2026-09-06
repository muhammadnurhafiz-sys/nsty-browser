import { describe, it, expect, vi } from 'vitest'

const handlers = new Map<string, (...args: unknown[]) => unknown>()
vi.mock('electron', () => ({
  contextBridge: { exposeInMainWorld: vi.fn((_name: string, api: Record<string, unknown>) => { handlers.set('api', () => api) }) },
  ipcRenderer: { send: vi.fn(), invoke: vi.fn(async () => ({ revision: 1 })), on: vi.fn(), removeListener: vi.fn() },
}))

describe('preload API', () => {
  it('exposes the main-owned browser bridge used by BrowserShell', async () => {
    await import('./index')
    const api = handlers.get('api')?.() as Record<string, unknown>
    expect(typeof api.getBrowserSnapshot).toBe('function')
    expect(typeof api.dispatchBrowserAction).toBe('function')
    expect(typeof api.onBrowserSnapshot).toBe('function')
    expect(typeof api.onBrowserShortcut).toBe('function')
    expect(typeof api.searchHistory).toBe('function')
    expect(typeof api.onBrowserPreview).toBe('function')
    const { ipcRenderer } = await import('electron')
    await (api.dispatchBrowserAction as (a: unknown) => Promise<unknown>)({ type: 'tab:new' })
    expect(ipcRenderer.invoke).toHaveBeenCalledWith('browser:action', { type: 'tab:new' })
    const off = (api.onBrowserSnapshot as (cb: () => void) => () => void)(() => undefined)
    expect(ipcRenderer.on).toHaveBeenCalledWith('browser:snapshot', expect.any(Function))
    off()
    expect(ipcRenderer.removeListener).toHaveBeenCalledWith('browser:snapshot', expect.any(Function))
  })
})
