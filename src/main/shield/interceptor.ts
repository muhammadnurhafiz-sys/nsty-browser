import { BrowserWindow } from 'electron'
import { ShieldEngine } from './engine'
import { injectYouTubeScript } from './youtube'

export function setupInterceptor(window: BrowserWindow, engine: ShieldEngine): void {
  // The Ghostery blocker handles webRequest interception automatically
  // via enableBlockingInSession(). We add extra handling here:

  // 1. Per-domain disable check
  // 2. YouTube-specific content script injection
  // 3. Stats forwarding to renderer

  // Forward shield stats to renderer periodically
  let statsInterval: ReturnType<typeof setInterval> | null = null

  const startStatsForwarding = () => {
    statsInterval = setInterval(() => {
      if (window.isDestroyed()) {
        if (statsInterval) clearInterval(statsInterval)
        return
      }

      // Get active tab URL to determine current domain stats
      const focusedView = window.getBrowserViews().find(v => {
        try {
          return !v.webContents.isDestroyed()
        } catch {
          return false
        }
      })

      if (focusedView) {
        try {
          const url = new URL(focusedView.webContents.getURL())
          const stats = engine.getStatsForDomain(url.hostname)
          window.webContents.send('shield:stats', {
            tabId: '', // Will be mapped by tab manager
            stats,
          })
        } catch {
          // Invalid URL or destroyed, skip
        }
      }
    }, 2000) // Update every 2 seconds
  }

  startStatsForwarding()

  // Inject YouTube script on navigation
  window.webContents.session.webRequest.onCompleted(
    { urls: ['*://*.youtube.com/*'] },
    (details) => {
      if (details.resourceType === 'mainFrame') {
        // Find the BrowserView that loaded this URL and inject the script
        for (const view of window.getBrowserViews()) {
          try {
            if (!view.webContents.isDestroyed() && view.webContents.getURL().includes('youtube.com')) {
              injectYouTubeScript(view.webContents)
            }
          } catch {
            // View destroyed, skip
          }
        }
      }
    },
  )
}
