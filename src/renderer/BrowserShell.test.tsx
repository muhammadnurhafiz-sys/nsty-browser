import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserShell } from './BrowserShell'
import { DEFAULT_BROWSER_PREFERENCES, type BrowserSnapshot } from '../shared/browser'
const snapshot: BrowserSnapshot = { revision: 1, tabs: [], activeTabId: null, activeSpace: 'Work', preferences: DEFAULT_BROWSER_PREFERENCES, bookmarks: [], history: [], downloads: [], extensions: [], pendingPermission: null, permissions: [], shieldExceptions: [], shieldReady: true, capabilities: { extensions: true, privateBrowsing: true } }
describe('Browser shell native state', () => {
 it('creates tabs only after native snapshot and ignores stale hydration', async () => {
  let emit: (s: BrowserSnapshot) => void = () => {}
  let hydrate: (s: BrowserSnapshot) => void = () => {}
  const dispatch = vi.fn(async () => ({ ok: true, snapshot }))
  window.nsty = { getBrowserSnapshot: () => new Promise(resolve => { hydrate = resolve }), onBrowserSnapshot: (cb: typeof emit) => { emit = cb; return () => {} }, dispatchBrowserAction: dispatch } as unknown as typeof window.nsty
  render(<BrowserShell />)
  emit({ ...snapshot, revision: 3, tabs: [{ id: 'native-id', title: 'Actual tab', url: '', space: 'Work', private: false, loading: false, canGoBack: false, canGoForward: false, muted: false, zoom: 1, error: null, blocked: 0 }], activeTabId: 'native-id' })
  hydrate(snapshot)
  await screen.findByRole('button', { name: 'Select Actual tab' })
  fireEvent.click(screen.getByRole('button', { name: 'New tab' }))
  await waitFor(() => expect(dispatch).toHaveBeenCalledWith({ type: 'tab:new' }))
  expect(screen.getAllByRole('button', { name: /Select Actual tab/ })).toHaveLength(1)
 })
})
