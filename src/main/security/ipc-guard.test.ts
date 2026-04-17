import { describe, it, expect } from 'vitest'
import { __testing } from './ipc-guard'

const { isTrustedSender } = __testing

function makeEvent(url: string | null | undefined) {
  const frame = url === null ? null : { url }
  return { senderFrame: frame } as unknown as Electron.IpcMainEvent
}

describe('isTrustedSender', () => {
  it('accepts the custom app:// protocol', () => {
    expect(isTrustedSender(makeEvent('app://./index.html'))).toBe(true)
  })

  it('accepts the Vite HMR origin', () => {
    expect(isTrustedSender(makeEvent('http://localhost:5173/'))).toBe(true)
  })

  it('rejects arbitrary external origins', () => {
    expect(isTrustedSender(makeEvent('https://evil.example/'))).toBe(false)
    expect(isTrustedSender(makeEvent('file:///etc/passwd'))).toBe(false)
  })

  it('rejects events with no senderFrame', () => {
    expect(isTrustedSender(makeEvent(null))).toBe(false)
  })

  it('rejects events with empty url', () => {
    expect(isTrustedSender(makeEvent(undefined))).toBe(false)
    expect(isTrustedSender(makeEvent(''))).toBe(false)
  })
})
