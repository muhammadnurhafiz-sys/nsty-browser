type Level = 'debug' | 'info' | 'warn' | 'error'

function format(level: Level, module: string, msg: string, ctx?: object): string {
  const base = `[${level.toUpperCase()}] [${module}] ${msg}`
  return ctx ? `${base} ${JSON.stringify(ctx)}` : base
}

function emit(level: Level, module: string, msg: string, ctx?: object): void {
  const line = format(level, module, msg, ctx)
  const consoleFn = level === 'debug' ? 'log' : level
  // eslint-disable-next-line no-console
  console[consoleFn](line)
}

export interface Logger {
  debug: (msg: string, ctx?: object) => void
  info: (msg: string, ctx?: object) => void
  warn: (msg: string, ctx?: object) => void
  error: (msg: string, ctx?: object) => void
}

export function createLogger(module: string): Logger {
  return {
    debug: (msg, ctx) => emit('debug', module, msg, ctx),
    info: (msg, ctx) => emit('info', module, msg, ctx),
    warn: (msg, ctx) => emit('warn', module, msg, ctx),
    error: (msg, ctx) => emit('error', module, msg, ctx),
  }
}

export const __testing = { format }
