import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import { OverlayShell } from './overlay/OverlayShell'
import './styles/globals.css'

// The same bundle serves two views: the window shell, and the transparent
// overlay WebContentsView that main layers above the live page.
const isOverlay = window.location.hash === '#overlay'
if (isOverlay) document.documentElement.classList.add('overlay-mode')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      {isOverlay ? <OverlayShell /> : <App />}
    </ErrorBoundary>
  </StrictMode>,
)
