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
    return () => ipcRenderer.removeListener('tab:updated', listener)
  },

  // Space management
  switchSpace: (spaceId: string) =>
    ipcRenderer.send('space:switch', spaceId),

  // Shield
  onShieldStats: (callback: (event: unknown) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, data: unknown) => callback(data)
    ipcRenderer.on('shield:stats', listener)
    return () => ipcRenderer.removeListener('shield:stats', listener)
  },
  toggleShield: (domain: string, enabled: boolean) =>
    ipcRenderer.send('shield:toggle', domain, enabled),

  // AI
  sendAiMessage: (message: string, conversationId: string | null) =>
    ipcRenderer.send('ai:send', message, conversationId),
  onAiStream: (callback: (chunk: string) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, chunk: string) => callback(chunk)
    ipcRenderer.on('ai:stream', listener)
    return () => ipcRenderer.removeListener('ai:stream', listener)
  },
  onAiStreamEnd: (callback: () => void) => {
    const listener = () => callback()
    ipcRenderer.on('ai:stream:end', listener)
    return () => ipcRenderer.removeListener('ai:stream:end', listener)
  },

  // Sidebar
  toggleSidebar: () => ipcRenderer.send('sidebar:toggle'),
  onSidebarToggle: (callback: (expanded: boolean) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, expanded: boolean) => callback(expanded)
    ipcRenderer.on('sidebar:toggled', listener)
    return () => ipcRenderer.removeListener('sidebar:toggled', listener)
  },

  // AI panel
  toggleAiPanel: () => ipcRenderer.send('ai:toggle'),
  onAiPanelToggle: (callback: (open: boolean) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, open: boolean) => callback(open)
    ipcRenderer.on('ai:toggled', listener)
    return () => ipcRenderer.removeListener('ai:toggled', listener)
  },

  // Session
  getSpaces: () => ipcRenderer.invoke('session:getSpaces'),
  saveSpaces: (spaces: unknown) => ipcRenderer.send('session:saveSpaces', spaces),
}

contextBridge.exposeInMainWorld('nsty', api)

export type NstyApi = typeof api
