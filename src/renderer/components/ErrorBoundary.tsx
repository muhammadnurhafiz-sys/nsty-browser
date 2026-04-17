import { Component, type ReactNode, type ErrorInfo } from 'react'
import { createLogger } from '../utils/logger'

const log = createLogger('ErrorBoundary')

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    log.error('render error', {
      message: error.message,
      stack: error.stack,
      componentStack: info.componentStack,
    })
  }

  private handleReload = (): void => {
    window.location.reload()
  }

  override render(): ReactNode {
    if (!this.state.error) return this.props.children

    return (
      <div
        role="alert"
        style={{
          height: '100vh',
          width: '100vw',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--surface)',
          color: 'var(--on-surface)',
          padding: '24px',
        }}
      >
        <div style={{ maxWidth: 420, textAlign: 'center' }}>
          <div
            className="material-symbols-outlined"
            aria-hidden="true"
            style={{ fontSize: 48, color: 'var(--primary)', marginBottom: 16 }}
          >
            warning
          </div>
          <h1 className="font-headline" style={{ fontSize: 20, marginBottom: 8 }}>
            Something went wrong
          </h1>
          <p className="font-body" style={{ fontSize: 13, color: 'var(--on-surface-variant)', marginBottom: 20 }}>
            The app hit an unexpected error. Reload to continue — your tabs are preserved.
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            className="font-label"
            style={{
              padding: '10px 20px',
              borderRadius: 8,
              background: 'var(--primary)',
              color: 'var(--on-primary)',
              border: 'none',
              cursor: 'pointer',
              fontSize: 11,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              fontWeight: 600,
            }}
          >
            Reload
          </button>
        </div>
      </div>
    )
  }
}
