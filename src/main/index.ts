import { app, BrowserWindow, globalShortcut, protocol, net, session } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import { pathToFileURL } from 'node:url'
import { TabManager } from './tab-manager'
import { WindowManager } from './window-manager'
import { registerIpcHandlers } from './ipc-handlers'
import { ShieldEngine } from './shield/engine'
import { setupInterceptor } from './shield/interceptor'
import { scheduleFilterUpdates } from './shield/filter-lists'
import { closeDatabase } from './store/database'
import { ClaudeClient } from './ai/claude-client'
import { setupAutoUpdater } from './updater'
import { installCsp } from './security/csp'
import { applyNavigationGuard } from './security/navigation-guard'

let mainWindow: BrowserWindow | null = null
let tabManager: TabManager | null = null
let windowManager: WindowManager | null = null
let shieldEngine: ShieldEngine | null = null
let claudeClient: ClaudeClient | null = null

const isDev = !app.isPackaged

// Debug logger — writes to a file next to the exe so we can diagnose packaged builds
const logFile = path.join(app.getPath('userData'), 'nsty-debug.log')
function debugLog(msg: string): void {
  const line = `[${new Date().toISOString()}] ${msg}\n`
  fs.appendFileSync(logFile, line)
  console.log(msg)
}

// Register custom protocol before app is ready — required for file:// CORS compat
protocol.registerSchemesAsPrivileged([{
  scheme: 'app',
  privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true },
}])

function createWindow(): void {
  const isMac = process.platform === 'darwin'
  const platformOptions = isMac
    ? { titleBarStyle: 'hiddenInset' as const, trafficLightPosition: { x: 12, y: 12 } }
    : {
        titleBarStyle: 'hidden' as const,
        titleBarOverlay: { color: '#111113', symbolColor: '#94a3b8', height: 42 },
      }

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    ...platformOptions,
    icon: path.join(__dirname, '../../resources/icons/icon.png'),
    backgroundColor: '#111113',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  applyNavigationGuard(mainWindow.webContents)

  tabManager = new TabManager(mainWindow)
  windowManager = new WindowManager(mainWindow, tabManager)

  // Initialize Claude AI client
  claudeClient = new ClaudeClient(mainWindow)
  claudeClient.initialize()

  registerIpcHandlers(tabManager, windowManager, claudeClient)

  // Initialize shield (ad blocker)
  shieldEngine = new ShieldEngine()
  shieldEngine.initialize().then(() => {
    if (shieldEngine && mainWindow) {
      shieldEngine.enableOnSession()
      shieldEngine.setupStatsTracking()
      setupInterceptor(mainWindow, shieldEngine)
      scheduleFilterUpdates()
      console.log('[Nsty] Shield engine ready')
    }
  }).catch((err) => {
    console.error('[Nsty] Failed to initialize shield:', err)
  })

  // Auto-updater (production only)
  if (!isDev) {
    setupAutoUpdater(mainWindow)
  }

  // Error handling for renderer load failures
  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    debugLog(`[FAIL-LOAD] code=${errorCode} desc=${errorDescription} url=${validatedURL}`)
  })

  mainWindow.webContents.on('did-finish-load', () => {
    debugLog('[SUCCESS] Renderer finished loading')
  })

  mainWindow.webContents.on('console-message', (_event, level, message) => {
    if (level >= 2) debugLog(`[RENDERER-ERROR] ${message}`)
  })

  // Load renderer
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    const rendererPath = path.join(app.getAppPath(), 'dist', 'renderer', 'index.html')
    debugLog(`[INIT] appPath=${app.getAppPath()}`)
    debugLog(`[INIT] rendererPath=${rendererPath}`)
    debugLog(`[INIT] rendererExists=${fs.existsSync(rendererPath)}`)
    debugLog(`[INIT] __dirname=${__dirname}`)
    debugLog(`[INIT] preloadPath=${path.join(__dirname, '../preload/index.js')}`)

    mainWindow.loadFile(rendererPath)
  }

  // Register global shortcuts
  globalShortcut.register('CommandOrControl+\\', () => {
    if (!mainWindow || !windowManager) return
    const expanded = windowManager.toggleSidebar()
    mainWindow.webContents.send('sidebar:toggled', expanded)
  })

  globalShortcut.register('CommandOrControl+T', () => {
    if (!mainWindow || !tabManager) return
    // Create tab in current space — renderer will send the spaceId
    mainWindow.webContents.send('shortcut:newTab')
  })

  globalShortcut.register('CommandOrControl+W', () => {
    if (!tabManager) return
    const activeTab = tabManager.getActiveTab()
    if (activeTab) {
      tabManager.closeTab(activeTab.id)
      mainWindow?.webContents.send('tab:closed', activeTab.id)
    }
  })

  globalShortcut.register('CommandOrControl+L', () => {
    mainWindow?.webContents.send('shortcut:focusAddressBar')
  })

  globalShortcut.register('CommandOrControl+Shift+H', () => {
    mainWindow?.webContents.send('shortcut:toggleHistory')
  })

  mainWindow.on('closed', () => {
    mainWindow = null
    tabManager = null
    windowManager = null
  })
}

app.whenReady().then(() => {
  // Serve renderer files via custom protocol (avoids file:// CORS issues with Vite's crossorigin attributes)
  protocol.handle('app', (request) => {
    const { pathname } = new URL(request.url)
    const pathToServe = path.join(app.getAppPath(), 'dist', 'renderer', pathname)
    return net.fetch(pathToFileURL(pathToServe).toString())
  })

  // Strict CSP for every response — blocks inline-script injection and
  // prevents foreign origins from running code or embedding the window.
  installCsp(session.defaultSession, isDev)

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  globalShortcut.unregisterAll()
  closeDatabase()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
