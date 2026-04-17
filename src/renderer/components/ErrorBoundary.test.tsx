import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ErrorBoundary } from './ErrorBoundary'

function Bomb(): never {
  throw new Error('boom')
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // Suppress React's expected error-boundary console output during the throw.
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>all good</div>
      </ErrorBoundary>,
    )
    expect(screen.getByText('all good')).toBeDefined()
  })

  it('renders fallback UI when a child throws', () => {
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    )
    expect(screen.getByRole('alert')).toBeDefined()
    expect(screen.getByText(/something went wrong/i)).toBeDefined()
    expect(screen.getByRole('button', { name: /reload/i })).toBeDefined()
  })
})
