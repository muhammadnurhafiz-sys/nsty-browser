import { app, BrowserWindow, protocol, net, session } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import { pathToFileURL } from 'node:url'
import { BrowserService } from './browser-service'
import { registerIpcHandlers } from './ipc-handlers'
import { closeDatabase } from './store/database'
import { ClaudeClient } from './ai/claude-client'
import { setupAutoUpdater } from './updater'
import { installCsp } from './security/csp'
import { applyNavigationGuard } from './security/navigation-guard'
import { createLogger } from './utils/logger'
import { installCrashHandlers } from './utils/crash-handlers'

const log = createLogger('main')

let mainWindow: BrowserWindow | null = null
let browserService: BrowserService | null = null
let claudeClient: ClaudeClient | null = null

const isDev = !app.isPackaged

// Height of the BrowserShell toolbar; the OS caption overlay (Windows/Linux)
// is sized to match so the native buttons sit on the toolbar, not beside it.
const TOOLBAR_HEIGHT = 54

// Register custom protocol before app is ready — required for file:// CORS compat
protocol.registerSchemesAsPrivileged([{
  scheme: 'app',
  privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true },
}])

function createWindow(): void {
  const isMac = process.platform === 'darwin'
  const platformOptions = isMac
    ? { titleBarStyle: 'hiddenInset' as const, trafficLightPosition: { x: 12, y: 18 } }
    : {
        titleBarStyle: 'hidden' as const,
        titleBarOverlay: { color: '#292C30', symbolColor: '#F0F1EC', height: TOOLBAR_HEIGHT },
      }

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    ...platformOptions,
    icon: path.join(__dirname, '../../resources/icons/icon.png'),
    backgroundColor: '#17191C',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  applyNavigationGuard(mainWindow.webContents)

  // Main-owned browser state: tabs, sessions, Shield, downloads, extensions,
  // permissions and persistence all live here; the renderer only renders snapshots.
  browserService = new BrowserService(mainWindow)
  browserService.registerIpc()
  void browserService.initializeShield()
  void browserService.loadExtensions()

  // Initialize Claude AI client
  claudeClient = new ClaudeClient(mainWindow)
  claudeClient.initialize()

  registerIpcHandlers(browserService, claudeClient)

  // Auto-updater (production only)
  if (!isDev) {
    setupAutoUpdater(mainWindow)
  }

  // Error handling for renderer load failures
  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    log.error('renderer load failed', { errorCode, errorDescription, validatedURL })
  })

  mainWindow.webContents.on('did-finish-load', () => {
    log.info('renderer finished loading')
  })

  mainWindow.webContents.on('console-message', (_event, level, message) => {
    if (level >= 2) log.warn('renderer console', { level, message })
  })

  // Load renderer
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    const rendererPath = path.join(app.getAppPath(), 'dist', 'renderer', 'index.html')
    log.info('loading renderer', {
      appPath: app.getAppPath(),
      rendererPath,
      rendererExists: fs.existsSync(rendererPath),
      preloadPath: path.join(__dirname, '../preload/index.js'),
    })

    // Load via the app:// custom protocol (registered below) instead of file://.
    // file:// is treated as an opaque origin under CSP, which caused self-hosted
    // fonts to fail load — icons then fell back to their ligature names as text
    // ("search", "arrow_back", ...) and overflowed their button containers.
    mainWindow.loadURL('app://bundle/index.html')
  }

  // Keyboard shortcuts are handled in-process: BrowserShell for the chrome,
  // BrowserService (before-input-event) for focused page views. No global
  // shortcuts — they would steal keys from every other application.

  mainWindow.on('closed', () => {
    browserService?.dispose()
    browserService = null
    mainWindow = null
  })
}

app.whenReady().then(() => {
  installCrashHandlers()

  // Serve renderer files via custom protocol. Using app:// instead of file://
  // gives the renderer a real origin that CSP's 'self' can match — otherwise
  // font/style/script loads under file:// are treated as opaque and rejected.
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
  closeDatabase()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
