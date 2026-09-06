import { ipcMain, type IpcMainEvent, type IpcMainInvokeEvent } from 'electron'
import { isShellUrl } from '../../shared/browser-policy'
import { createLogger } from '../utils/logger'

const log = createLogger('ipc-guard')

// Dev origin (Vite) is only trusted when main opts in at startup; packaged
// builds accept the exact app://bundle/index.html shell frame and nothing else.
let allowDevOrigin = false
export function configureIpcGuard(options: { dev: boolean }): void {
  allowDevOrigin = options.dev
  log.info('ipc guard configured', { dev: options.dev })
}

function isTrustedSender(event: IpcMainEvent | IpcMainInvokeEvent): boolean {
  const frame = event.senderFrame
  if (!frame) return false
  const url = frame.url
  if (!url) return false
  return isShellUrl(url, allowDevOrigin)
}

type SendHandler = (event: IpcMainEvent, ...args: unknown[]) => void
type InvokeHandler = (event: IpcMainInvokeEvent, ...args: unknown[]) => unknown | Promise<unknown>

export function safeOn(channel: string, handler: SendHandler): void {
  ipcMain.on(channel, (event, ...args) => {
    if (!isTrustedSender(event)) {
      log.warn('reject send', { channel, sender: event.senderFrame?.url ?? '<unknown>' })
      return
    }
    handler(event, ...args)
  })
}

export function safeHandle(channel: string, handler: InvokeHandler): void {
  ipcMain.handle(channel, (event, ...args) => {
    if (!isTrustedSender(event)) {
      log.warn('reject handle', { channel, sender: event.senderFrame?.url ?? '<unknown>' })
      throw new Error(`IPC channel '${channel}' rejected — untrusted sender`)
    }
    return handler(event, ...args)
  })
}

export const __testing = { isTrustedSender }
