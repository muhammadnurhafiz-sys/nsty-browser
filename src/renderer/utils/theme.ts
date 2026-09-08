import { useEffect, useState } from 'react'
import type { BrowserTheme } from '../../shared/browser'
import { createLogger } from './logger'

const log = createLogger('theme')

/**
 * Resolves the stored theme preference into a concrete palette, following the
 * system palette when the preference is 'system'. Shared by the chrome shell
 * and the overlay shell so both render with the same tokens.
 */
export function useShellTheme(theme: BrowserTheme): 'graphite' | 'paper' {
  const [systemDark, setSystemDark] = useState(() => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true)
  useEffect(() => {
    log.debug('watch system palette')
    const media = window.matchMedia?.('(prefers-color-scheme: dark)')
    const change = () => setSystemDark(media?.matches ?? true)
    media?.addEventListener('change', change)
    return () => media?.removeEventListener('change', change)
  }, [])
  return theme === 'system' ? (systemDark ? 'graphite' : 'paper') : theme
}
