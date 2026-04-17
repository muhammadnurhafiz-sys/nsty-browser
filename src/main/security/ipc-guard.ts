import { ipcMain, type IpcMainEvent, type IpcMainInvokeEvent } from 'electron'

const ALLOWED_ORIGINS = ['app://', 'http://localhost:5173']

function isTrustedSender(event: IpcMainEvent | IpcMainInvokeEvent): boolean {
  const frame = event.senderFrame
  if (!frame) return false
  const url = frame.url
  if (!url) return false
  return ALLOWED_ORIGINS.some(prefix => url.startsWith(prefix))
}

type SendHandler = (event: IpcMainEvent, ...args: unknown[]) => void
type InvokeHandler = (event: IpcMainInvokeEvent, ...args: unknown[]) => unknown | Promise<unknown>

export function safeOn(channel: string, handler: SendHandler): void {
  ipcMain.on(channel, (event, ...args) => {
    if (!isTrustedSender(event)) {
      console.warn(`[ipc-guard] reject on '${channel}' from ${event.senderFrame?.url ?? '<unknown>'}`)
      return
    }
    handler(event, ...args)
  })
}

export function safeHandle(channel: string, handler: InvokeHandler): void {
  ipcMain.handle(channel, (event, ...args) => {
    if (!isTrustedSender(event)) {
      console.warn(`[ipc-guard] reject handle '${channel}' from ${event.senderFrame?.url ?? '<unknown>'}`)
      throw new Error(`IPC channel '${channel}' rejected — untrusted sender`)
    }
    return handler(event, ...args)
  })
}

export const __testing = { isTrustedSender, ALLOWED_ORIGINS }
