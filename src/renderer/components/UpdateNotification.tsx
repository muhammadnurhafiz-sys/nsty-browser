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
    return () => {
      cleanups.forEach(fn => {
        fn?.()
      })
    }
  }, [])

  if (!updateInfo || dismissed) return null

  return (
    <div
      className="fixed bottom-4 right-4 z-50 w-72 rounded-xl shadow-2xl overflow-hidden glass-panel fade-in"
    >
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]" style={{ color: 'var(--primary)' }}>system_update</span>
            <span className="font-headline text-xs font-semibold" style={{ color: 'var(--on-surface)' }}>
              Update Available
            </span>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="w-6 h-6 rounded-full flex items-center justify-center cursor-pointer hover:bg-white/10 transition-colors"
            style={{ color: 'var(--outline)' }}
          >
            <span className="material-symbols-outlined text-[14px]">close</span>
          </button>
        </div>
        <p className="font-body text-[11px] mb-3" style={{ color: 'var(--on-surface-variant)' }}>
          Version {updateInfo.version} is ready
        </p>

        {progress !== null && (
          <div className="mb-3">
            <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--surface-container-highest)' }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${progress}%`,
                  background: 'linear-gradient(135deg, var(--primary), var(--primary-container))',
                  transition: 'width 300ms ease',
                }}
              />
            </div>
            <span className="font-label text-[10px] mt-1 block" style={{ color: 'var(--outline)' }}>
              {Math.round(progress)}%
            </span>
          </div>
        )}

        {downloaded ? (
          <button
            onClick={() => window.nsty?.installUpdate()}
            className="w-full h-8 rounded-lg font-label text-[10px] uppercase tracking-widest font-bold cursor-pointer hover:brightness-110 transition-all"
            style={{
              background: 'linear-gradient(135deg, var(--primary), var(--primary-container))',
              color: 'var(--on-primary)',
            }}
          >
            Restart to Update
          </button>
        ) : progress === null ? (
          <button
            onClick={() => window.nsty?.downloadUpdate()}
            className="w-full h-8 rounded-lg font-label text-[10px] uppercase tracking-widest font-bold cursor-pointer hover:brightness-110 transition-all"
            style={{
              background: 'var(--primary)',
              color: 'var(--on-primary)',
            }}
          >
            Download Update
          </button>
        ) : null}
      </div>
    </div>
  )
}
