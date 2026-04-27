import { app, BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { initDb } from './db'
import { registerIpcHandlers } from './ipc'
import { log, attachDevWindow } from './lib/logger'

const isDev = process.env.NODE_ENV === 'development'

// ─── Global error handlers ────────────────────────────────────────────────────
process.on('uncaughtException', (error) => log.error('Uncaught exception', error))
process.on('unhandledRejection', (reason) => log.error('Unhandled rejection', reason))

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'darwin' && {
      titleBarStyle: 'hiddenInset' as const,
      trafficLightPosition: { x: 16, y: 17 }
    }),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
    attachDevWindow(mainWindow)
    log.info('Window ready')
  })

  // Forward renderer console messages to the terminal
  mainWindow.webContents.on('console-message', (_e, level, message, line, sourceId) => {
    log.renderer(level, message, sourceId, line)
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  log.info('App ready — Electron', process.versions.electron, '/ Node', process.versions.node)

  if (process.platform === 'win32') {
    app.setAppUserModelId('de.joreslab.jlab')
  }

  const db = initDb()
  registerIpcHandlers(db)

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
