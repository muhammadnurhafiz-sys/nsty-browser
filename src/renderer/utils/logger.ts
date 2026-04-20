type Level = 'debug' | 'info' | 'warn' | 'error'

// Debug logs are suppressed in production so render-path log calls don't pay
// the JSON.stringify cost on every frame. Info/warn/error always fire.
const isDev = Boolean((import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV)

function format(level: Level, module: string, msg: string, ctx?: object): string {
  const base = `[${level.toUpperCase()}] [${module}] ${msg}`
  return ctx ? `${base} ${JSON.stringify(ctx)}` : base
}

export interface Logger {
  debug: (msg: string, ctx?: object) => void
  info: (msg: string, ctx?: object) => void
  warn: (msg: string, ctx?: object) => void
  error: (msg: string, ctx?: object) => void
}

export function createLogger(module: string): Logger {
  return {
    // eslint-disable-next-line no-console
    debug: (msg, ctx) => { if (isDev) console.log(format('debug', module, msg, ctx)) },
    // eslint-disable-next-line no-console
    info: (msg, ctx) => console.info(format('info', module, msg, ctx)),
    // eslint-disable-next-line no-console
    warn: (msg, ctx) => console.warn(format('warn', module, msg, ctx)),
    // eslint-disable-next-line no-console
    error: (msg, ctx) => console.error(format('error', module, msg, ctx)),
  }
}

export const __testing = { format }
