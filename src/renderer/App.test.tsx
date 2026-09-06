import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('./BrowserShell', () => ({ BrowserShell: () => <div data-testid="browser-shell" /> }))
vi.mock('./components/UpdateNotification', () => ({ UpdateNotification: () => <div data-testid="update-notification" /> }))

describe('App', () => {
  it('mounts the main-owned BrowserShell as the browser chrome', async () => {
    const { App } = await import('./App')
    render(<App />)
    expect(screen.getByTestId('browser-shell')).toBeTruthy()
    expect(screen.getByTestId('update-notification')).toBeTruthy()
  })
})
