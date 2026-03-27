import { describe, it, expect, vi } from 'vitest'

// Mock electron and electron-updater before import
vi.mock('electron', () => ({
  BrowserWindow: vi.fn(),
}))

vi.mock('electron-updater', () => ({
  autoUpdater: {
    autoDownload: false,
    autoInstallOnAppQuit: true,
    on: vi.fn(),
    checkForUpdates: vi.fn().mockResolvedValue(null),
    downloadUpdate: vi.fn().mockResolvedValue(null),
    quitAndInstall: vi.fn(),
  },
}))

describe('updater', () => {
  it('setupAutoUpdater configures autoUpdater and registers event listeners', async () => {
    const { autoUpdater } = await import('electron-updater')
    const { setupAutoUpdater } = await import('./updater')

    const mockWindow = {
      webContents: { send: vi.fn() },
    } as any

    vi.useFakeTimers()
    setupAutoUpdater(mockWindow)

    expect(autoUpdater.autoDownload).toBe(false)
    expect(autoUpdater.on).toHaveBeenCalledWith('update-available', expect.any(Function))
    expect(autoUpdater.on).toHaveBeenCalledWith('download-progress', expect.any(Function))
    expect(autoUpdater.on).toHaveBeenCalledWith('update-downloaded', expect.any(Function))
    expect(autoUpdater.on).toHaveBeenCalledWith('error', expect.any(Function))

    // Trigger the delayed check
    vi.advanceTimersByTime(5000)
    expect(autoUpdater.checkForUpdates).toHaveBeenCalled()

    vi.useRealTimers()
  })

  it('downloadUpdate calls autoUpdater.downloadUpdate', async () => {
    const { autoUpdater } = await import('electron-updater')
    const { downloadUpdate } = await import('./updater')

    downloadUpdate()
    expect(autoUpdater.downloadUpdate).toHaveBeenCalled()
  })

  it('installUpdate calls autoUpdater.quitAndInstall', async () => {
    const { autoUpdater } = await import('electron-updater')
    const { installUpdate } = await import('./updater')

    installUpdate()
    expect(autoUpdater.quitAndInstall).toHaveBeenCalledWith(false, true)
  })
})
