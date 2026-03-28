import { ipcMain } from 'electron'
import { TabManager } from './tab-manager'
import { WindowManager } from './window-manager'
import { ClaudeClient } from './ai/claude-client'
import { extractPageContext } from './ai/page-context'
import { downloadUpdate, installUpdate } from './updater'

export function registerIpcHandlers(
  tabManager: TabManager,
  windowManager: WindowManager,
  claudeClient?: ClaudeClient,
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

  // Overlay (hide BrowserView so DOM modals are visible)
  ipcMain.on('overlay:show', () => {
    tabManager.hideActiveView()
  })

  ipcMain.on('overlay:hide', () => {
    tabManager.showActiveView()
    windowManager.updateLayout()
  })

  // Session
  ipcMain.handle('session:getSpaces', () => {
    // Will be implemented with session store
    return null
  })

  ipcMain.handle('layout:info', () => {
    return windowManager.getLayoutInfo()
  })

  // AI messages
  ipcMain.on('ai:send', async (_event, message: string, conversationId: string | null) => {
    if (!claudeClient) return

    // Extract page context from active tab
    const activeView = tabManager.getActiveView()
    const pageContext = await extractPageContext(activeView)

    // Send to Claude (streaming handled inside client)
    await claudeClient.sendMessage(message, conversationId, pageContext, 'sonnet')
  })

  // AI API key setup
  ipcMain.on('ai:setApiKey', (_event, apiKey: string) => {
    claudeClient?.setApiKey(apiKey)
  })

  ipcMain.handle('ai:isReady', () => {
    return claudeClient?.isReady() ?? false
  })

  // Auto-update
  ipcMain.on('update:download', () => {
    downloadUpdate()
  })

  ipcMain.on('update:install', () => {
    installUpdate()
  })
}
