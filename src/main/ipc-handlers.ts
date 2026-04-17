import type { TabManager } from './tab-manager'
import type { WindowManager } from './window-manager'
import type { ClaudeClient } from './ai/claude-client'
import { extractPageContext } from './ai/page-context'
import { downloadUpdate, installUpdate } from './updater'
import { safeOn, safeHandle } from './security/ipc-guard'
import { createLogger } from './utils/logger'

const log = createLogger('ipc-handlers')

export function registerIpcHandlers(
  tabManager: TabManager,
  windowManager: WindowManager,
  claudeClient?: ClaudeClient,
): void {
  log.info('registering guarded IPC channels')

  // Tab management
  safeOn('tab:create', (event, ...args) => {
    const [url, spaceId] = args as [string, string]
    const tab = tabManager.createTab(url, spaceId)
    windowManager.updateLayout()
    event.sender.send('tab:created', tab)
  })

  safeOn('tab:close', (_event, ...args) => {
    const [tabId] = args as [string]
    tabManager.closeTab(tabId)
  })

  safeOn('tab:switch', (_event, ...args) => {
    const [tabId] = args as [string]
    tabManager.switchTab(tabId)
    windowManager.updateLayout()
  })

  safeOn('tab:navigate', (_event, ...args) => {
    const [url] = args as [string]
    tabManager.navigateTo(url)
  })

  safeOn('tab:back', () => {
    tabManager.goBack()
  })

  safeOn('tab:forward', () => {
    tabManager.goForward()
  })

  safeOn('tab:reload', () => {
    tabManager.reload()
  })

  // Space management
  safeOn('space:switch', (_event, ...args) => {
    const [spaceId] = args as [string]
    tabManager.switchSpace(spaceId)
    windowManager.updateLayout()
  })

  // Sidebar
  safeOn('sidebar:toggle', (event) => {
    const expanded = windowManager.toggleSidebar()
    event.sender.send('sidebar:toggled', expanded)
  })

  // Overlay (hide BrowserView so DOM modals are visible)
  safeOn('overlay:show', () => {
    tabManager.hideActiveView()
  })

  safeOn('overlay:hide', () => {
    tabManager.showActiveView()
    windowManager.updateLayout()
  })

  // Session
  safeHandle('session:getSpaces', () => {
    // Will be implemented with session store
    return null
  })

  safeHandle('layout:info', () => {
    return windowManager.getLayoutInfo()
  })

  // AI messages
  safeOn('ai:send', async (_event, ...args) => {
    const [message, conversationId] = args as [string, string | null]
    if (!claudeClient) return

    const activeView = tabManager.getActiveView()
    const pageContext = await extractPageContext(activeView)

    await claudeClient.sendMessage(message, conversationId, pageContext, 'sonnet')
  })

  // AI API key setup
  safeOn('ai:setApiKey', (_event, ...args) => {
    const [apiKey] = args as [string]
    claudeClient?.setApiKey(apiKey)
  })

  safeHandle('ai:isReady', () => {
    return claudeClient?.isReady() ?? false
  })

  // Auto-update
  safeOn('update:download', () => {
    downloadUpdate()
  })

  safeOn('update:install', () => {
    installUpdate()
  })
}
