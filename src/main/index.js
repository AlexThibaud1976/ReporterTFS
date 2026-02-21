const { app, BrowserWindow, ipcMain, shell } = require('electron')
const path = require('path')
const isDev = process.env.NODE_ENV === 'development'

// ─── Import des handlers IPC ───────────────────────────────────────────────
const authHandlers = require('./ipcHandlers/auth.handler')
const adoHandlers = require('./ipcHandlers/ado.handler')
const exportHandlers = require('./ipcHandlers/export.handler')
const scheduleHandlers = require('./ipcHandlers/schedule.handler')
const { scheduleService } = scheduleHandlers

let mainWindow = null

// ─── Création de la fenêtre principale ────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    title: 'TFSReporter',
    icon: path.join(__dirname, '../../assets/icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,        // Sécurité : désactivé
      contextIsolation: true,        // Sécurité : activé
      sandbox: false,
    },
    backgroundColor: '#1e1e2e',
    show: false, // Afficher seulement quand prêt (évite le flash blanc)
  })

  // ─── Chargement de l'UI ─────────────────────────────────────────────────
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(process.resourcesPath, 'renderer', 'index.html'))
  }

  // ─── Afficher quand prêt ────────────────────────────────────────────────
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    mainWindow.focus()
  })

  // ─── Ouvrir liens externes dans le navigateur ───────────────────────────
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// ─── Cycle de vie Electron ─────────────────────────────────────────────────
app.whenReady().then(() => {
  createWindow()

  // Enregistrer tous les handlers IPC
  authHandlers.register(ipcMain)
  adoHandlers.register(ipcMain)
  exportHandlers.register(ipcMain)
  scheduleHandlers.register(ipcMain)

  // ─── Handlers système ────────────────────────────────────────────────
  ipcMain.handle('system:openFile', async (_, filePath) => {
    const error = await shell.openPath(filePath)
    return { success: !error, error: error || null }
  })
  ipcMain.handle('system:getVersion', () => app.getVersion())

  // Démarrer le service de planification (Phase 4)
  scheduleService.init(mainWindow)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// ─── Sécurité : bloquer la navigation externe ──────────────────────────────
app.on('web-contents-created', (_, contents) => {
  contents.on('will-navigate', (event, url) => {
    if (!url.startsWith('http://localhost') && !url.startsWith('file://')) {
      event.preventDefault()
    }
  })
})
