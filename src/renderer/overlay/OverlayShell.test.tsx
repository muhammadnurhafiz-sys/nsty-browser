import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { OverlayShell } from './OverlayShell'
import { DEFAULT_BROWSER_PREFERENCES, type BrowserOverlay, type BrowserSnapshot, type BrowserTab } from '../../shared/browser'

afterEach(() => cleanup())

const tab: BrowserTab = { id: 'tab-a', url: 'https://a.test/', title: 'Alpha', space: 'Work', private: false, loading: false, canGoBack: false, canGoForward: false, muted: false, zoom: 1, error: null, blocked: 0, favicon: null, audible: false, find: { active: 2, total: 7 } }
const base: BrowserSnapshot = { revision: 1, tabs: [tab], activeTabId: 'tab-a', activeSpace: 'Work', spaces: ['Work'], preferences: DEFAULT_BROWSER_PREFERENCES, bookmarks: [], history: [], downloads: [], extensions: [], pendingPermission: null, permissions: [], shieldExceptions: [], shieldReady: true, capabilities: { extensions: true, privateBrowsing: true }, overlay: null }
const withOverlay = (overlay: BrowserOverlay): BrowserSnapshot => ({ ...base, overlay })

function mount(overlay: BrowserOverlay | null, extra: Partial<BrowserSnapshot> = {}) {
  const snapshot = { ...(overlay ? withOverlay(overlay) : base), ...extra }
  const dispatch = vi.fn(async (_action: unknown) => ({ ok: true, snapshot }))
  window.nsty = { getBrowserSnapshot: async () => snapshot, onBrowserSnapshot: () => () => {}, dispatchBrowserAction: dispatch } as unknown as typeof window.nsty
  render(<OverlayShell />)
  return dispatch
}

describe('OverlayShell surfaces', () => {
  it('renders nothing until a surface is open', async () => {
    mount(null)
    await waitFor(() => expect(document.querySelector('.bs-popover')).toBeNull())
    expect(document.querySelector('.bs-backdrop')).toBeNull()
  })
  it('positions the menu popover under its anchor, relative to the content origin', async () => {
    mount({ surface: 'menu', anchor: { x: 900, y: 60, width: 36, height: 36 }, payload: {}, origin: { x: 240, y: 54 } })
    const popover = await waitFor(() => { const node = document.querySelector('.bs-popover'); expect(node).not.toBeNull(); return node as HTMLElement })
    expect(popover.style.top).toBe('48px')
    expect(popover.style.left).toBe('396px')
    expect(popover.getAttribute('role')).toBe('menu')
  })
  it('closes on Escape and on a mousedown over the transparent area', async () => {
    const dispatch = mount({ surface: 'menu', anchor: { x: 100, y: 60, width: 36, height: 36 }, payload: {}, origin: { x: 0, y: 54 } })
    await waitFor(() => expect(document.querySelector('.bs-popover')).not.toBeNull())
    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(dispatch).toHaveBeenCalledWith({ type: 'overlay:close' }))
    dispatch.mockClear()
    const root = document.querySelector('.bs-overlay-root') as HTMLElement
    fireEvent.mouseDown(root)
    await waitFor(() => expect(dispatch).toHaveBeenCalledWith({ type: 'overlay:close' }))
  })
  it('keeps the permission surface open when Escape is pressed', async () => {
    const dispatch = mount({ surface: 'permission', anchor: null, payload: {}, origin: { x: 240, y: 54 } }, { pendingPermission: { id: 'p1', origin: 'https://a.test', permission: 'geolocation', tabId: 'tab-a' } })
    await screen.findByText('https://a.test')
    fireEvent.keyDown(document, { key: 'Escape' })
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(dispatch).not.toHaveBeenCalledWith({ type: 'overlay:close' })
    expect(document.querySelector('.bs-backdrop')).not.toBeNull()
  })
  it('clears the find highlights before closing the find surface', async () => {
    const dispatch = mount({ surface: 'find', anchor: null, payload: {}, origin: { x: 240, y: 54 } })
    await screen.findByLabelText('Find in page')
    expect(screen.getByText('2 of 7')).toBeTruthy()
    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(dispatch).toHaveBeenCalledWith({ type: 'overlay:close' }))
    expect(dispatch).toHaveBeenCalledWith({ type: 'find', text: '' })
    expect(dispatch.mock.calls.findIndex(c => (c[0] as { type: string }).type === 'find')).toBeLessThan(dispatch.mock.calls.findIndex(c => (c[0] as { type: string }).type === 'overlay:close'))
  })
  it('accepts a suggestion row on click and highlights it on hover', async () => {
    const rows = [{ kind: 'url' as const, title: 'Go to a.test', url: 'https://a.test/' }, { kind: 'search' as const, title: 'Search Google for “a.test”', url: 'https://www.google.com/search?q=a.test' }]
    const dispatch = mount({ surface: 'suggestions', anchor: { x: 300, y: 10, width: 400, height: 34 }, payload: { query: 'a.test', rows, highlight: 0 }, origin: { x: 240, y: 54 } })
    const option = await screen.findByRole('option', { name: /Search Google/ })
    fireEvent.mouseEnter(option)
    await waitFor(() => expect(dispatch).toHaveBeenCalledWith({ type: 'suggest:highlight', index: 1 }))
    fireEvent.click(option)
    await waitFor(() => expect(dispatch).toHaveBeenCalledWith({ type: 'suggest:accept' }))
  })
  it('shows link and image items only when the click had them, and inspects at the click point', async () => {
    const payload = { x: 120, y: 240, linkURL: '', srcURL: '', mediaType: 'none', selectionText: '', isEditable: false, canGoBack: true, canGoForward: false, canCopy: true, canPaste: false, canCut: false, canSelectAll: true }
    const dispatch = mount({ surface: 'context', anchor: { x: 360, y: 294, width: 0, height: 0 }, payload, origin: { x: 240, y: 54 } })
    await screen.findByRole('menuitem', { name: 'Back' })
    expect(screen.queryByRole('menuitem', { name: /Open link in new tab/ })).toBeNull()
    expect(screen.queryByRole('menuitem', { name: /Copy image address/ })).toBeNull()
    expect(screen.getByRole('menuitem', { name: 'Forward' })).toHaveProperty('disabled', true)
    fireEvent.click(screen.getByRole('menuitem', { name: /Inspect/ }))
    await waitFor(() => expect(dispatch).toHaveBeenCalledWith({ type: 'context', command: 'inspect', x: 120, y: 240 }))
  })
  it('offers link and image commands for a link on an image', async () => {
    const payload = { x: 10, y: 20, linkURL: 'https://link.test/', srcURL: 'https://img.test/a.png', mediaType: 'image', selectionText: '', isEditable: false, canGoBack: false, canGoForward: false, canCopy: false, canPaste: false, canCut: false, canSelectAll: true }
    const dispatch = mount({ surface: 'context', anchor: { x: 250, y: 74, width: 0, height: 0 }, payload, origin: { x: 240, y: 54 } })
    fireEvent.click(await screen.findByRole('menuitem', { name: /Open link in private tab/ }))
    await waitFor(() => expect(dispatch).toHaveBeenCalledWith({ type: 'context', command: 'open-link-private', url: 'https://link.test/' }))
    fireEvent.click(screen.getByRole('menuitem', { name: /Save image/ }))
    await waitFor(() => expect(dispatch).toHaveBeenCalledWith({ type: 'context', command: 'save-image', url: 'https://img.test/a.png' }))
    expect(screen.getByRole('menuitem', { name: 'Copy' })).toHaveProperty('disabled', true)
  })
  it('moves focus between context menu items with the arrow keys', async () => {
    const payload = { x: 1, y: 1, linkURL: '', srcURL: '', mediaType: 'none', selectionText: '', isEditable: false, canGoBack: true, canGoForward: true, canCopy: true, canPaste: false, canCut: false, canSelectAll: true }
    mount({ surface: 'context', anchor: { x: 250, y: 74, width: 0, height: 0 }, payload, origin: { x: 240, y: 54 } })
    const back = await screen.findByRole('menuitem', { name: 'Back' })
    await waitFor(() => expect(document.activeElement).toBe(back))
    fireEvent.keyDown(document, { key: 'ArrowDown' })
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Forward' }))
    fireEvent.keyDown(document, { key: 'ArrowUp' })
    expect(document.activeElement).toBe(back)
  })
  it('signs in or cancels the credential prompt without closing the overlay', async () => {
    const dispatch = mount({ surface: 'auth', anchor: null, payload: { id: 'auth-1', host: 'site.test', realm: 'Staging', isProxy: false }, origin: { x: 240, y: 54 } })
    await screen.findByText(/Sign in to site.test/)
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'ada' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'hunter2' } })
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    await waitFor(() => expect(dispatch).toHaveBeenCalledWith({ type: 'auth:respond', id: 'auth-1', username: 'ada', password: 'hunter2' }))
    expect(dispatch).not.toHaveBeenCalledWith({ type: 'overlay:close' })
    dispatch.mockClear()
    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(dispatch).toHaveBeenCalledWith({ type: 'auth:respond', id: 'auth-1' }))
    expect(dispatch).not.toHaveBeenCalledWith({ type: 'overlay:close' })
  })
  it('runs tab actions against the tab the surface was opened for', async () => {
    const dispatch = mount({ surface: 'tabs', anchor: { x: 10, y: 100, width: 200, height: 32 }, payload: { tabId: 'tab-a' }, origin: { x: 0, y: 54 } })
    fireEvent.click(await screen.findByRole('menuitem', { name: /Duplicate tab/ }))
    await waitFor(() => expect(dispatch).toHaveBeenCalledWith({ type: 'tab:duplicate', id: 'tab-a' }))
  })
})
