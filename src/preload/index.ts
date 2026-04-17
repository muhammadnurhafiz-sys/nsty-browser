import { contextBridge, ipcRenderer } from 'electron'

const api = {
  // Tab management
  createTab: (url: string, spaceId: string) =>
    ipcRenderer.send('tab:create', url, spaceId),
  closeTab: (tabId: string) =>
    ipcRenderer.send('tab:close', tabId),
  switchTab: (tabId: string) =>
    ipcRenderer.send('tab:switch', tabId),
  navigateTo: (url: string) =>
    ipcRenderer.send('tab:navigate', url),
  goBack: () => ipcRenderer.send('tab:back'),
  goForward: () => ipcRenderer.send('tab:forward'),
  reload: () => ipcRenderer.send('tab:reload'),
  onTabUpdated: (callback: (event: unknown) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, data: unknown) => callback(data)
    ipcRenderer.on('tab:updated', listener)
    return () => { ipcRenderer.removeListener('tab:updated', listener) }
  },

  // Space management
  switchSpace: (spaceId: string) =>
    ipcRenderer.send('space:switch', spaceId),

  // Shield
  onShieldStats: (callback: (event: unknown) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, data: unknown) => callback(data)
    ipcRenderer.on('shield:stats', listener)
    return () => { ipcRenderer.removeListener('shield:stats', listener) }
  },
  toggleShield: (domain: string, enabled: boolean) =>
    ipcRenderer.send('shield:toggle', domain, enabled),

  // AI
  sendAiMessage: (message: string, conversationId: string | null) =>
    ipcRenderer.send('ai:send', message, conversationId),
  onAiStream: (callback: (chunk: string) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, chunk: string) => callback(chunk)
    ipcRenderer.on('ai:stream', listener)
    return () => { ipcRenderer.removeListener('ai:stream', listener) }
  },
  onAiStreamEnd: (callback: () => void) => {
    const listener = () => callback()
    ipcRenderer.on('ai:stream:end', listener)
    return () => { ipcRenderer.removeListener('ai:stream:end', listener) }
  },

  // New tab shortcut
  onNewTabShortcut: (callback: () => void) => {
    const listener = () => callback()
    ipcRenderer.on('shortcut:newTab', listener)
    return () => { ipcRenderer.removeListener('shortcut:newTab', listener) }
  },

  // History
  onHistoryToggle: (callback: () => void) => {
    const listener = () => callback()
    ipcRenderer.on('shortcut:toggleHistory', listener)
    return () => { ipcRenderer.removeListener('shortcut:toggleHistory', listener) }
  },

  // Address bar focus
  onFocusAddressBar: (callback: () => void) => {
    const listener = () => callback()
    ipcRenderer.on('shortcut:focusAddressBar', listener)
    return () => { ipcRenderer.removeListener('shortcut:focusAddressBar', listener) }
  },

  // Sidebar
  toggleSidebar: () => ipcRenderer.send('sidebar:toggle'),
  onSidebarToggle: (callback: (expanded: boolean) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, expanded: boolean) => callback(expanded)
    ipcRenderer.on('sidebar:toggled', listener)
    return () => { ipcRenderer.removeListener('sidebar:toggled', listener) }
  },

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

  // Overlay (hide BrowserView for modals)
  showOverlay: () => ipcRenderer.send('overlay:show'),
  hideOverlay: () => ipcRenderer.send('overlay:hide'),

  // Session
  getSpaces: () => ipcRenderer.invoke('session:getSpaces'),
  saveSpaces: (spaces: unknown) => ipcRenderer.send('session:saveSpaces', spaces),
}

contextBridge.exposeInMainWorld('nsty', api)

export type NstyApi = typeof api
