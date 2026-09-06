import { contextBridge, ipcRenderer } from 'electron'

const api = {
  // Auto-update
  onUpdateAvailable: (callback: (info: { version: string; releaseNotes: string }) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, info: { version: string; releaseNotes: string }) => callback(info)
    ipcRenderer.on('update:available', listener)
    return () => { ipcRenderer.removeListener('update:available', listener) }
  },
  onUpdateProgress: (callback: (progress: { percent: number }) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, progress: { percent: number }) => callback(progress)
    ipcRenderer.on('update:progress', listener)
    return () => { ipcRenderer.removeListener('update:progress', listener) }
  },
  onUpdateDownloaded: (callback: () => void) => {
    const listener = () => callback()
    ipcRenderer.on('update:downloaded', listener)
    return () => { ipcRenderer.removeListener('update:downloaded', listener) }
  },
  downloadUpdate: () => ipcRenderer.send('update:download'),
  installUpdate: () => ipcRenderer.send('update:install'),

  // Main-owned browser state (BrowserService). The renderer never creates
  // tabs or IDs itself: it renders snapshots and submits typed actions.
  getBrowserSnapshot: () => ipcRenderer.invoke('browser:getSnapshot'),
  dispatchBrowserAction: (action: unknown) => ipcRenderer.invoke('browser:action', action),
  // Bounded history query kept out of the snapshot so navigation events stay small.
  searchHistory: (query: string, limit?: number) => ipcRenderer.invoke('browser:history', query, limit),
  onBrowserSnapshot: (callback: (snapshot: unknown) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, snapshot: unknown) => callback(snapshot)
    ipcRenderer.on('browser:snapshot', listener)
    return () => { ipcRenderer.removeListener('browser:snapshot', listener) }
  },
  // JPEG data URL of the active page captured when an overlay opens (null when it closes),
  // so dialogs can blur the page instead of a blank area. Sent apart from snapshots.
  onBrowserPreview: (callback: (dataUrl: string | null) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, dataUrl: string | null) => callback(dataUrl)
    ipcRenderer.on('browser:preview', listener)
    return () => { ipcRenderer.removeListener('browser:preview', listener) }
  },
  // Shortcuts pressed while a page view has focus are forwarded by main.
  onBrowserShortcut: (callback: (key: string) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, key: string) => callback(key)
    ipcRenderer.on('browser:shortcut', listener)
    return () => { ipcRenderer.removeListener('browser:shortcut', listener) }
  },

  // Platform — authoritative process.platform, surfaced so renderer doesn't
  // resort to UA sniffing for chrome padding / shortcut decisions.
  platform: process.platform,
}

contextBridge.exposeInMainWorld('nsty', api)

export type NstyApi = typeof api
