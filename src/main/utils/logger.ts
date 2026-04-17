import { app } from 'electron'
import fs from 'node:fs'
import path from 'node:path'

type Level = 'debug' | 'info' | 'warn' | 'error'

const LEVEL_ORDER: Record<Level, number> = { debug: 0, info: 1, warn: 2, error: 3 }
const MIN_LEVEL: Level = (process.env.NSTY_LOG_LEVEL as Level) || 'debug'

let cachedLogFile: string | null = null

function getLogFile(): string {
  if (cachedLogFile) return cachedLogFile
  try {
    cachedLogFile = path.join(app.getPath('userData'), 'nsty-debug.log')
    return cachedLogFile
  } catch {
    return path.join(process.cwd(), 'nsty-debug.log')
  }
}

function format(level: Level, module: string, msg: string, ctx?: object): string {
  const base = `[${new Date().toISOString()}] [${level.toUpperCase()}] [${module}] ${msg}`
  return ctx ? `${base} ${JSON.stringify(ctx)}` : base
}

function emit(level: Level, module: string, msg: string, ctx?: object): void {
  if (LEVEL_ORDER[level] < LEVEL_ORDER[MIN_LEVEL]) return
  const line = format(level, module, msg, ctx)
  const consoleFn = level === 'debug' ? 'log' : level
  // eslint-disable-next-line no-console
  console[consoleFn](line)
  try {
    fs.appendFile(getLogFile(), line + '\n', () => undefined)
  } catch {
    // If we can't write to disk, dropping the line is better than crashing.
  }
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
