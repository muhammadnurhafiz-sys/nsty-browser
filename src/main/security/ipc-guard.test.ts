import { describe, it, expect, beforeEach } from 'vitest'
import { __testing, configureIpcGuard } from './ipc-guard'

const { isTrustedSender } = __testing

function makeEvent(url: string | null | undefined) {
  const frame = url === null ? null : { url }
  return { senderFrame: frame } as unknown as Electron.IpcMainEvent
}

describe('isTrustedSender (exact shell identity, shared with BrowserService)', () => {
  beforeEach(() => configureIpcGuard({ dev: false }))

  it('accepts only the packaged shell frame', () => {
    expect(isTrustedSender(makeEvent('app://bundle/index.html'))).toBe(true)
    expect(isTrustedSender(makeEvent('app://attacker/index.html'))).toBe(false)
    expect(isTrustedSender(makeEvent('app://bundle/other.html'))).toBe(false)
  })

  it('accepts the Vite origin only when dev is enabled and never a prefix spoof', () => {
    expect(isTrustedSender(makeEvent('http://localhost:5173/'))).toBe(false)
    configureIpcGuard({ dev: true })
    expect(isTrustedSender(makeEvent('http://localhost:5173/'))).toBe(true)
    expect(isTrustedSender(makeEvent('http://localhost:5173.attacker/'))).toBe(false)
    expect(isTrustedSender(makeEvent('http://localhost:51730/'))).toBe(false)
  })

  it('rejects arbitrary external origins', () => {
    expect(isTrustedSender(makeEvent('https://evil.example/'))).toBe(false)
    expect(isTrustedSender(makeEvent('file:///etc/passwd'))).toBe(false)
  })

  it('rejects events with no senderFrame or empty url', () => {
    expect(isTrustedSender(makeEvent(null))).toBe(false)
    expect(isTrustedSender(makeEvent(undefined))).toBe(false)
    expect(isTrustedSender(makeEvent(''))).toBe(false)
  })
})
