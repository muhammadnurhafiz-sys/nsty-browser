import { app, type App } from 'electron'
import { createLogger } from './logger'

const log = createLogger('crash')

export function installCrashHandlers(electronApp: App = app): void {
  log.info('installing process + renderer crash handlers')

  process.on('uncaughtException', (err) => {
    log.error('uncaught exception', { message: err.message, stack: err.stack })
  })

  process.on('unhandledRejection', (reason) => {
    const msg = reason instanceof Error ? reason.message : String(reason)
    const stack = reason instanceof Error ? reason.stack : undefined
    log.error('unhandled rejection', { message: msg, stack })
  })

  electronApp.on('render-process-gone', (_event, _contents, details) => {
    log.error('renderer process gone', { reason: details.reason, exitCode: details.exitCode })
  })

  electronApp.on('child-process-gone', (_event, details) => {
    log.error('child process gone', {
      type: details.type,
      reason: details.reason,
      exitCode: details.exitCode,
      name: details.name,
    })
  })
}
