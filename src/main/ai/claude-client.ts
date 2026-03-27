import Anthropic from '@anthropic-ai/sdk'
import { BrowserWindow, safeStorage } from 'electron'
import { randomUUID } from 'crypto'
import { getSetting, setSetting } from '../store/settings'
import { saveConversation, saveMessage, getConversationMessages } from '../store/database'

const MODEL_MAP = {
  sonnet: 'claude-sonnet-4-6',
  haiku: 'claude-haiku-4-5-20251001',
  opus: 'claude-opus-4-6',
} as const

export class ClaudeClient {
  private client: Anthropic | null = null
  private window: BrowserWindow

  constructor(window: BrowserWindow) {
    this.window = window
  }

  initialize(): boolean {
    const encryptedKey = getSetting('encryptedApiKey')
    if (!encryptedKey) return false

    try {
      const apiKey = safeStorage.decryptString(Buffer.from(encryptedKey, 'base64'))
      this.client = new Anthropic({ apiKey })
      return true
    } catch {
      console.error('[AI] Failed to decrypt API key')
      return false
    }
  }

  setApiKey(apiKey: string): void {
    const encrypted = safeStorage.encryptString(apiKey).toString('base64')
    setSetting('encryptedApiKey', encrypted)
    this.client = new Anthropic({ apiKey })
  }

  isReady(): boolean {
    return this.client !== null
  }

  async sendMessage(
    message: string,
    conversationId: string | null,
    pageContext: string | null,
    model: 'sonnet' | 'haiku' | 'opus' = 'sonnet',
  ): Promise<string> {
    if (!this.client) {
      this.window.webContents.send('ai:error', 'API key not configured. Open settings to add your Anthropic API key.')
      return ''
    }

    // Create or get conversation
    const convId = conversationId ?? randomUUID()

    // Load conversation history
    const history = conversationId
      ? (getConversationMessages(conversationId) as Array<{ role: string; content: string }>)
      : []

    // Build messages array
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
      ...history.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user', content: message },
    ]

    // Build system prompt with page context
    const systemParts: string[] = [
      'You are Claude, an AI assistant integrated into the Nsty Browser. Be helpful, concise, and direct.',
    ]
    if (pageContext) {
      systemParts.push(
        '\n\nThe user is currently viewing a web page. Here is the page content (truncated):\n\n' +
        pageContext,
      )
    }

    // Save user message
    saveMessage(convId, 'user', message, null)

    // Stream response
    let fullResponse = ''

    try {
      this.window.webContents.send('ai:stream:start', convId)

      const stream = this.client.messages.stream({
        model: MODEL_MAP[model],
        max_tokens: 4096,
        system: systemParts.join(''),
        messages,
      })

      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          const chunk = event.delta.text
          fullResponse += chunk
          this.window.webContents.send('ai:stream', chunk)
        }
      }

      // Save assistant response
      const usage = await stream.finalMessage()
      const tokensUsed = usage.usage.output_tokens

      saveMessage(convId, 'assistant', fullResponse, tokensUsed)

      // Save/update conversation
      const title = message.length > 50 ? message.slice(0, 47) + '...' : message
      saveConversation(convId, title, model, null)

      this.window.webContents.send('ai:stream:end', convId)

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      console.error('[AI] Stream error:', errorMessage)
      this.window.webContents.send('ai:error', `Failed to get response: ${errorMessage}`)
      this.window.webContents.send('ai:stream:end', convId)
    }

    return fullResponse
  }
}
