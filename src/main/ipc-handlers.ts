import type { BrowserService } from './browser-service'
import type { ClaudeClient } from './ai/claude-client'
import { extractPageContext } from './ai/page-context'
import { downloadUpdate, installUpdate } from './updater'
import { safeOn, safeHandle } from './security/ipc-guard'
import { createLogger } from './utils/logger'

const log = createLogger('ipc-handlers')

// Browser state channels (tabs, navigation, overlay, session) are owned by
// BrowserService.registerIpc — it validates the exact shell identity and every
// action payload. Only the AI and updater channels remain here.
export function registerIpcHandlers(
  browser: Pick<BrowserService, 'getActiveView'>,
  claudeClient?: ClaudeClient,
): void {
  log.info('registering guarded IPC channels (ai, updater)')

  // AI messages
  safeOn('ai:send', async (_event, ...args) => {
    const [message, conversationId] = args as [string, string | null]
    if (!claudeClient) return

    const pageContext = await extractPageContext(browser.getActiveView())
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
