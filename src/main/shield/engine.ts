import { ElectronBlocker } from '@ghostery/adblocker-electron'
import fetch from 'cross-fetch'
import { session } from 'electron'
import type { ShieldStats } from '../../shared/types'

export class ShieldEngine {
  private blocker: ElectronBlocker | null = null
  private enabled = true
  private disabledDomains = new Set<string>()
  private stats = new Map<string, ShieldStats>()

  async initialize(): Promise<void> {
    // Load blocker with default filter lists (EasyList, EasyPrivacy, uBlock, etc.)
    this.blocker = await ElectronBlocker.fromPrebuiltAdsAndTracking(fetch)
    console.log('[Shield] Engine initialized with prebuilt filter lists')
  }

  enableOnSession(ses?: Electron.Session): void {
    if (!this.blocker) return
    const target = ses ?? session.defaultSession
    this.blocker.enableBlockingInSession(target)
    console.log('[Shield] Blocking enabled on session')
  }

  disableOnSession(ses?: Electron.Session): void {
    if (!this.blocker) return
    const target = ses ?? session.defaultSession
    this.blocker.disableBlockingInSession(target)
    console.log('[Shield] Blocking disabled on session')
  }

  isEnabled(): boolean {
    return this.enabled
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled
    if (enabled) {
      this.enableOnSession()
    } else {
      this.disableOnSession()
    }
  }

  isDomainDisabled(domain: string): boolean {
    return this.disabledDomains.has(domain)
  }

  toggleDomain(domain: string, enabled: boolean): void {
    if (enabled) {
      this.disabledDomains.delete(domain)
    } else {
      this.disabledDomains.add(domain)
    }
  }

  // Track blocking stats per domain
  recordBlock(domain: string, type: 'ad' | 'tracker', bytes: number): void {
    const existing = this.stats.get(domain) ?? {
      domain,
      adsBlocked: 0,
      trackersBlocked: 0,
      bytesSaved: 0,
    }

    if (type === 'ad') {
      existing.adsBlocked++
    } else {
      existing.trackersBlocked++
    }
    existing.bytesSaved += bytes

    this.stats.set(domain, existing)
  }

  getStatsForDomain(domain: string): ShieldStats {
    return this.stats.get(domain) ?? {
      domain,
      adsBlocked: 0,
      trackersBlocked: 0,
      bytesSaved: 0,
    }
  }

  getAllStats(): ShieldStats[] {
    return Array.from(this.stats.values())
  }

  // Listen for blocking events to track stats
  setupStatsTracking(): void {
    if (!this.blocker) return

    this.blocker.on('request-blocked', (request) => {
      try {
        const url = new URL(request.url)
        const domain = url.hostname
        // Estimate blocked request size at ~10KB average
        this.recordBlock(domain, 'ad', 10240)
      } catch {
        // Invalid URL, skip
      }
    })

    this.blocker.on('request-redirected', (request) => {
      try {
        const url = new URL(request.url)
        const domain = url.hostname
        this.recordBlock(domain, 'tracker', 5120)
      } catch {
        // Invalid URL, skip
      }
    })
  }
}
