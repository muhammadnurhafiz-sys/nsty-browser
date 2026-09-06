// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'

vi.mock('electron', () => ({ app: { getPath: () => '/tmp' } }))
// Simulates the Windows failure mode: the packaged native module is not loadable.
vi.mock('better-sqlite3', () => { throw new Error('%1 is not a valid Win32 application') })

describe('database (native module unavailable)', () => {
  it('imports without throwing so the app can still start', async () => {
    await expect(import('./database')).resolves.toBeTruthy()
  })
  it('reports a clear error only when the database is actually used', async () => {
    const { getDatabase, closeDatabase } = await import('./database')
    expect(() => getDatabase()).toThrow(/native module|better-sqlite3/i)
    expect(() => closeDatabase()).not.toThrow()
  })
})
