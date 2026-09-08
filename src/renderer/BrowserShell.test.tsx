import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'

afterEach(() => cleanup())
import { BrowserShell } from './BrowserShell'
import { DEFAULT_BROWSER_PREFERENCES, type BrowserSnapshot } from '../shared/browser'
const snapshot: BrowserSnapshot = { revision: 1, tabs: [], activeTabId: null, activeSpace: 'Work', spaces: ['Work', 'Personal', 'Dev'], preferences: DEFAULT_BROWSER_PREFERENCES, bookmarks: [], history: [], downloads: [], extensions: [], pendingPermission: null, permissions: [], shieldExceptions: [], shieldReady: true, capabilities: { extensions: true, privateBrowsing: true }, overlay: null }
describe('Browser shell native state', () => {
 it('collapsing the sidebar stores a preference and reports the new content rect', async () => {
  const dispatch = vi.fn(async () => ({ ok: true, snapshot }))
  window.nsty = { getBrowserSnapshot: async () => snapshot, onBrowserSnapshot: () => () => {}, dispatchBrowserAction: dispatch } as unknown as typeof window.nsty
  render(<BrowserShell />)
  await waitFor(() => expect(dispatch).toHaveBeenCalledWith({ type: 'layout', x: 240, y: 54 }))
  fireEvent.click(screen.getByRole('button', { name: 'Collapse sidebar' }))
  await waitFor(() => expect(dispatch).toHaveBeenCalledWith({ type: 'preferences', patch: { sidebarCollapsed: true } }))
 })
 it('creates tabs only after native snapshot and ignores stale hydration', async () => {
  let emit: (s: BrowserSnapshot) => void = () => {}
  let hydrate: (s: BrowserSnapshot) => void = () => {}
  const dispatch = vi.fn(async () => ({ ok: true, snapshot }))
  window.nsty = { getBrowserSnapshot: () => new Promise(resolve => { hydrate = resolve }), onBrowserSnapshot: (cb: typeof emit) => { emit = cb; return () => {} }, dispatchBrowserAction: dispatch } as unknown as typeof window.nsty
  render(<BrowserShell />)
  emit({ ...snapshot, revision: 3, tabs: [{ id: 'native-id', title: 'Actual tab', url: '', space: 'Work', private: false, loading: false, canGoBack: false, canGoForward: false, muted: false, zoom: 1, error: null, blocked: 0, favicon: null, audible: false, find: null }], activeTabId: 'native-id' })
  hydrate(snapshot)
  await screen.findByRole('button', { name: 'Select Actual tab' })
  fireEvent.click(screen.getByRole('button', { name: 'New tab' }))
  await waitFor(() => expect(dispatch).toHaveBeenCalledWith({ type: 'tab:new' }))
  expect(screen.getAllByRole('button', { name: /Select Actual tab/ })).toHaveLength(1)
 })
 it('opens the browser menu as an anchored overlay surface', async () => {
  const dispatch = vi.fn(async (_action: unknown) => ({ ok: true, snapshot }))
  window.nsty = { getBrowserSnapshot: async () => snapshot, onBrowserSnapshot: () => () => {}, dispatchBrowserAction: dispatch } as unknown as typeof window.nsty
  render(<BrowserShell />)
  fireEvent.click(screen.getByRole('button', { name: 'Browser menu' }))
  await waitFor(() => expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'overlay:open', surface: 'menu' })))
  const call = dispatch.mock.calls.map(c => c[0] as { type: string; anchor: Record<string, number> }).find(a => a.type === 'overlay:open')!
  expect(Object.values(call.anchor).every(v => Number.isFinite(v))).toBe(true)
 })
 it('asks main for omnibox suggestions as the address is typed', async () => {
  const dispatch = vi.fn(async () => ({ ok: true, snapshot }))
  window.nsty = { getBrowserSnapshot: async () => snapshot, onBrowserSnapshot: () => () => {}, dispatchBrowserAction: dispatch } as unknown as typeof window.nsty
  render(<BrowserShell />)
  fireEvent.change(screen.getByLabelText('Address and search'), { target: { value: 'goo' } })
  await waitFor(() => expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'suggest', query: 'goo' })))
 })
 it('forwards browser-owned key combinations to main', async () => {
  const dispatch = vi.fn(async (_action: unknown) => ({ ok: true, snapshot }))
  window.nsty = { getBrowserSnapshot: async () => snapshot, onBrowserSnapshot: () => () => {}, dispatchBrowserAction: dispatch } as unknown as typeof window.nsty
  render(<BrowserShell />)
  dispatch.mockClear()
  fireEvent.keyDown(document, { key: 'Tab', ctrlKey: true })
  await waitFor(() => expect(dispatch).toHaveBeenCalledWith({ type: 'shortcut', key: 'Tab', ctrl: true, shift: false, alt: false, meta: false }))
  fireEvent.keyDown(document, { key: 'a', ctrlKey: true })
  fireEvent.keyDown(document, { key: 'Tab' })
  expect(dispatch.mock.calls.filter(c => (c[0] as { type: string }).type === 'shortcut')).toHaveLength(1)
 })
 it('closes an open surface from its own button but reopens it after another button', async () => {
  const overlay = { surface: 'menu' as const, anchor: { x: 900, y: 8, width: 36, height: 36 }, payload: {}, origin: { x: 240, y: 54 } }
  let revision = 1
  const dispatch = vi.fn(async (action: unknown) => { revision++; const type = (action as { type: string }).type; return { ok: true, snapshot: { ...snapshot, overlay: type === 'overlay:open' ? overlay : null, revision } } })
  window.nsty = { getBrowserSnapshot: async () => snapshot, onBrowserSnapshot: () => () => {}, dispatchBrowserAction: dispatch } as unknown as typeof window.nsty
  render(<BrowserShell />)
  const menu = screen.getByRole('button', { name: 'Browser menu' })
  const other = screen.getByRole('button', { name: 'Extensions' })
  fireEvent.mouseDown(menu); fireEvent.click(menu)
  await waitFor(() => expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'overlay:open', surface: 'menu' })))
  dispatch.mockClear()
  fireEvent.mouseDown(menu); fireEvent.click(menu)
  await waitFor(() => expect(dispatch).toHaveBeenCalledWith({ type: 'overlay:close' }))
  expect(dispatch.mock.calls.some(c => (c[0] as { type: string }).type === 'overlay:open')).toBe(false)
  fireEvent.mouseDown(menu); fireEvent.click(menu)
  await waitFor(() => expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'overlay:open', surface: 'menu' })))
  dispatch.mockClear()
  fireEvent.mouseDown(other); fireEvent.click(other)
  await waitFor(() => expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'overlay:open', surface: 'extensions' })))
  dispatch.mockClear()
  fireEvent.mouseDown(menu); fireEvent.click(menu)
  await waitFor(() => expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'overlay:open', surface: 'menu' })))
 })
 it('right-clicking a sidebar tab opens tab actions for that tab without selecting it', async () => {
  const tabs = [{ id: 'tab-a', title: 'Alpha', url: 'https://a.test/', space: 'Work', private: false, loading: false, canGoBack: false, canGoForward: false, muted: false, zoom: 1, error: null, blocked: 0, favicon: null, audible: false, find: null }]
  const withTabs = { ...snapshot, tabs, activeTabId: 'tab-a' }
  const dispatch = vi.fn(async (_action: unknown) => ({ ok: true, snapshot: withTabs }))
  window.nsty = { getBrowserSnapshot: async () => withTabs, onBrowserSnapshot: () => () => {}, dispatchBrowserAction: dispatch } as unknown as typeof window.nsty
  render(<BrowserShell />)
  const tab = await screen.findByRole('button', { name: 'Select Alpha' })
  dispatch.mockClear()
  fireEvent.contextMenu(tab)
  await waitFor(() => expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'overlay:open', surface: 'tabs', payload: { tabId: 'tab-a' } })))
  expect(dispatch.mock.calls.some(c => (c[0] as { type: string }).type === 'tab:select')).toBe(false)
 })
})
