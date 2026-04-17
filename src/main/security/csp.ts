import type { Session } from 'electron'

const BASE_POLICY = {
  'default-src': ["'self'", 'app:'],
  'script-src': ["'self'", 'app:'],
  'style-src': ["'self'", 'app:', "'unsafe-inline'"],
  'img-src': ["'self'", 'app:', 'https:', 'data:', 'blob:'],
  'connect-src': ["'self'", 'app:', 'https://api.anthropic.com'],
  'font-src': ["'self'", 'app:', 'data:'],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'frame-ancestors': ["'none'"],
} as const

const DEV_ADDITIONS = {
  'script-src': ["'unsafe-eval'"],
  'connect-src': ['http://localhost:5173', 'ws://localhost:5173'],
  'style-src': ['http://localhost:5173'],
}

function buildPolicy(isDev: boolean): string {
  const merged: Record<string, string[]> = {}
  for (const [key, values] of Object.entries(BASE_POLICY)) {
    merged[key] = [...values]
  }
  if (isDev) {
    for (const [key, values] of Object.entries(DEV_ADDITIONS)) {
      merged[key] = [...(merged[key] ?? []), ...values]
    }
  }
  return Object.entries(merged)
    .map(([directive, values]) => `${directive} ${values.join(' ')}`)
    .join('; ')
}

export function buildCspPolicy(isDev: boolean): string {
  return buildPolicy(isDev)
}

export function installCsp(session: Session, isDev: boolean): void {
  const policy = buildPolicy(isDev)
  session.webRequest.onHeadersReceived((details, callback) => {
    const headers = { ...(details.responseHeaders ?? {}) }
    // Overwrite any existing CSP to ensure ours wins
    for (const existing of Object.keys(headers)) {
      if (existing.toLowerCase() === 'content-security-policy') {
        delete headers[existing]
      }
    }
    headers['Content-Security-Policy'] = [policy]
    callback({ responseHeaders: headers })
  })
}
