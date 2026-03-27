import { useState, useEffect } from 'react'

interface UpdateInfo {
  version: string
  releaseNotes: string
}

export function UpdateNotification() {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [downloaded, setDownloaded] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!window.nsty?.onUpdateAvailable) return
    const cleanups = [
      window.nsty.onUpdateAvailable((info) => {
        setUpdateInfo(info)
      }),
      window.nsty.onUpdateProgress?.((p) => {
        setProgress(p.percent)
      }),
      window.nsty.onUpdateDownloaded?.(() => {
        setDownloaded(true)
        setProgress(null)
      }),
    ]
    return () => cleanups.forEach(fn => fn?.())
  }, [])

  if (!updateInfo || dismissed) return null

  return (
    <div
      className="fixed bottom-4 right-4 z-50 w-72 rounded-xl shadow-2xl overflow-hidden"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-strong)',
        animation: 'scaleIn 200ms ease forwards',
      }}
    >
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
            Update Available
          </span>
          <button
            onClick={() => setDismissed(true)}
            className="text-xs cursor-pointer"
            style={{ color: 'var(--text-muted)' }}
          >
            ×
          </button>
        </div>
        <p className="text-[11px] mb-3" style={{ color: 'var(--text-secondary)' }}>
          Version {updateInfo.version} is ready
        </p>

        {progress !== null && (
          <div className="mb-3">
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${progress}%`,
                  background: 'var(--accent)',
                  transition: 'width 300ms ease',
                }}
              />
            </div>
            <span className="text-[10px] mt-1 block" style={{ color: 'var(--text-muted)' }}>
              {Math.round(progress)}%
            </span>
          </div>
        )}

        {downloaded ? (
          <button
            onClick={() => window.nsty?.installUpdate()}
            className="w-full h-7 rounded-lg text-xs font-medium cursor-pointer"
            style={{ background: 'var(--green)', color: '#111' }}
          >
            Restart to Update
          </button>
        ) : progress === null ? (
          <button
            onClick={() => window.nsty?.downloadUpdate()}
            className="w-full h-7 rounded-lg text-xs font-medium cursor-pointer"
            style={{ background: 'var(--accent)', color: 'white' }}
          >
            Download Update
          </button>
        ) : null}
      </div>
    </div>
  )
}
