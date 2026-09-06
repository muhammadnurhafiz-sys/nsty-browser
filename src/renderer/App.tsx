import { BrowserShell } from './BrowserShell'
import { UpdateNotification } from './components/UpdateNotification'

// The main process owns all browser state (tabs, history, downloads, Shield).
// BrowserShell renders its snapshots; the update toast is independent of it.
export function App() {
  return (
    <>
      <BrowserShell />
      <UpdateNotification />
    </>
  )
}
