import { useState, useEffect, useCallback } from 'react'
import type { ShieldStats, ShieldStatsEvent } from '@shared/types'

const EMPTY_STATS: ShieldStats = {
  domain: '',
  adsBlocked: 0,
  trackersBlocked: 0,
  bytesSaved: 0,
}

export function useShield() {
  const [stats, setStats] = useState<ShieldStats>(EMPTY_STATS)
  const [popupOpen, setPopupOpen] = useState(false)

  useEffect(() => {
    if (!window.nsty) return

    const cleanup = window.nsty.onShieldStats((data) => {
      const event = data as ShieldStatsEvent
      setStats(event.stats)
    })

    return cleanup
  }, [])

  const togglePopup = useCallback(() => {
    setPopupOpen(prev => !prev)
  }, [])

  const closePopup = useCallback(() => {
    setPopupOpen(false)
  }, [])

  const disableForSite = useCallback(() => {
    if (stats.domain) {
      window.nsty?.toggleShield(stats.domain, false)
    }
    setPopupOpen(false)
  }, [stats.domain])

  const totalBlocked = stats.adsBlocked + stats.trackersBlocked

  return {
    stats,
    totalBlocked,
    popupOpen,
    togglePopup,
    closePopup,
    disableForSite,
  }
}
