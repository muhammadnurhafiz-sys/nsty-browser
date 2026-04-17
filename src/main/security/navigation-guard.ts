import type { WebContents } from 'electron'
import { shell } from 'electron'
import { createLogger } from '../utils/logger'

const log = createLogger('nav-guard')

const ALLOWED_SCHEMES = /^(https?|app):/i

export function isAllowedNavigationUrl(url: string): boolean {
  return ALLOWED_SCHEMES.test(url)
}

export function applyNavigationGuard(webContents: WebContents): void {
  webContents.on('will-navigate', (event, url) => {
    if (!isAllowedNavigationUrl(url)) {
      event.preventDefault()
      log.warn('blocked will-navigate', { url })
    }
  })

  webContents.setWindowOpenHandler(({ url }) => {
    if (isAllowedNavigationUrl(url) && /^https?:/i.test(url)) {
      // External links open in the user's default browser — not a new Electron window.
      // This keeps our window shell minimal and stops foreign pages from spawning chromeless popups.
      shell.openExternal(url).catch(() => undefined)
    } else {
      log.warn('blocked new-window', { url })
    }
    return { action: 'deny' as const }
  })
}
