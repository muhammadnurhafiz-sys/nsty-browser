import { app, BrowserWindow, globalShortcut } from 'electron'
import path from 'path'
import { TabManager } from './tab-manager'
import { WindowManager } from './window-manager'
import { registerIpcHandlers } from './ipc-handlers'
import { ShieldEngine } from './shield/engine'
import { setupInterceptor } from './shield/interceptor'
import { scheduleFilterUpdates } from './shield/filter-lists'
import { closeDatabase } from './store/database'
import { ClaudeClient } from './ai/claude-client'
import { setupAutoUpdater } from './updater'

let mainWindow: BrowserWindow | null = null
let tabManager: TabManager | null = null
let windowManager: WindowManager | null = null
let shieldEngine: ShieldEngine | null = null
let claudeClient: ClaudeClient | null = null

const isDev = !app.isPackaged

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
    titleBarOverlay: process.platform === 'darwin' ? undefined : {
      color: '#111113',
      symbolColor: '#94a3b8',
      height: 42,
    },
    trafficLightPosition: process.platform === 'darwin' ? { x: 12, y: 12 } : undefined,
    icon: path.join(__dirname, '../../resources/icons/icon.png'),
    backgroundColor: '#111113',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

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

  // Load renderer
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../renderer/index.html'))
  }

  // Register global shortcuts
  globalShortcut.register('CommandOrControl+\\', () => {
    if (!mainWindow || !windowManager) return
    const expanded = windowManager.toggleSidebar()
    mainWindow.webContents.send('sidebar:toggled', expanded)
  })

  globalShortcut.register('CommandOrControl+Shift+A', () => {
    if (!mainWindow || !windowManager) return
    const open = windowManager.toggleAiPanel()
    mainWindow.webContents.send('ai:toggled', open)
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
