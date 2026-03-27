import { ipcMain } from 'electron'
import { TabManager } from './tab-manager'
import { WindowManager } from './window-manager'

export function registerIpcHandlers(
  tabManager: TabManager,
  windowManager: WindowManager,
): void {
  // Tab management
  ipcMain.on('tab:create', (_event, url: string, spaceId: string) => {
    const tab = tabManager.createTab(url, spaceId)
    windowManager.updateLayout()
    _event.sender.send('tab:created', tab)
  })

  ipcMain.on('tab:close', (_event, tabId: string) => {
    tabManager.closeTab(tabId)
  })

  ipcMain.on('tab:switch', (_event, tabId: string) => {
    tabManager.switchTab(tabId)
    windowManager.updateLayout()
  })

  ipcMain.on('tab:navigate', (_event, url: string) => {
    tabManager.navigateTo(url)
  })

  ipcMain.on('tab:back', () => {
    tabManager.goBack()
  })

  ipcMain.on('tab:forward', () => {
    tabManager.goForward()
  })

  ipcMain.on('tab:reload', () => {
    tabManager.reload()
  })

  // Space management
  ipcMain.on('space:switch', (_event, spaceId: string) => {
    tabManager.switchSpace(spaceId)
    windowManager.updateLayout()
  })

  // Sidebar
  ipcMain.on('sidebar:toggle', (event) => {
    const expanded = windowManager.toggleSidebar()
    event.sender.send('sidebar:toggled', expanded)
  })

  // AI panel
  ipcMain.on('ai:toggle', (event) => {
    const open = windowManager.toggleAiPanel()
    event.sender.send('ai:toggled', open)
  })

  // Session
  ipcMain.handle('session:getSpaces', () => {
    // Will be implemented with session store
    return null
  })

  ipcMain.handle('layout:info', () => {
    return windowManager.getLayoutInfo()
  })
}
