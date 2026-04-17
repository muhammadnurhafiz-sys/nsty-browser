import type { BrowserWindow } from 'electron'
import { autoUpdater } from 'electron-updater'

export function setupAutoUpdater(mainWindow: BrowserWindow): void {
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('update-available', (info) => {
    mainWindow.webContents.send('update:available', {
      version: info.version,
      releaseNotes: info.releaseNotes,
    })
  })

  autoUpdater.on('download-progress', (progress) => {
    mainWindow.webContents.send('update:progress', {
      percent: progress.percent,
      bytesPerSecond: progress.bytesPerSecond,
      transferred: progress.transferred,
      total: progress.total,
    })
  })

  autoUpdater.on('update-downloaded', () => {
    mainWindow.webContents.send('update:downloaded')
  })

  autoUpdater.on('error', (err) => {
    console.error('[Nsty] Auto-update error:', err.message)
  })

  // Check for updates after a short delay on startup
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((err) => {
      console.error('[Nsty] Update check failed:', err.message)
    })
  }, 5000)

  // Re-check every 4 hours
  setInterval(() => {
    autoUpdater.checkForUpdates().catch(() => {})
  }, 4 * 60 * 60 * 1000)
}

export function downloadUpdate(): void {
  autoUpdater.downloadUpdate().catch((err) => {
    console.error('[Nsty] Download update failed:', err.message)
  })
}

export function installUpdate(): void {
  autoUpdater.quitAndInstall(false, true)
}
