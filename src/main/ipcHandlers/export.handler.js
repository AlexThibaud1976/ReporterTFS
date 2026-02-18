const { dialog, shell } = require('electron')
const path = require('path')
const fs = require('fs')
const { store } = require('../store/store')

const HISTORY_MAX = 200

/**
 * Handlers IPC pour les exports et l'historique des rapports
 */
function register(ipcMain) {
  // Dialogue de sélection du fichier de sortie
  ipcMain.handle('export:chooseOutputPath', async (_, defaultName) => {
    const { filePath } = await dialog.showSaveDialog({
      defaultPath: defaultName,
      filters: [
        { name: 'PDF', extensions: ['pdf'] },
        { name: 'Excel', extensions: ['xlsx'] },
        { name: 'PowerPoint', extensions: ['pptx'] },
        { name: 'HTML', extensions: ['html'] },
        { name: 'Tous les fichiers', extensions: ['*'] },
      ],
    })
    return filePath || null
  })

  // Export PDF
  ipcMain.handle('export:toPdf', async (_, data, outputPath) => {
    const PdfService = require('../services/PdfService')
    const result = await PdfService.generate(data, outputPath)
    if (result.success) shell.openPath(outputPath)
    return result
  })

  // Export Excel
  ipcMain.handle('export:toExcel', async (_, data, outputPath) => {
    const ExcelService = require('../services/ExcelService')
    const result = await ExcelService.generate(data, outputPath)
    if (result.success) shell.openPath(outputPath)
    return result
  })

  // Export PowerPoint
  ipcMain.handle('export:toPptx', async (_, data, outputPath) => {
    const PptxService = require('../services/PptxService')
    const result = await PptxService.generate(data, outputPath)
    if (result.success) shell.openPath(outputPath)
    return result
  })

  // Export HTML
  ipcMain.handle('export:toHtml', async (_, data, outputPath) => {
    const HtmlService = require('../services/HtmlService')
    const result = await HtmlService.generate(data, outputPath)
    if (result.success) shell.openPath(outputPath)
    return result
  })

  // Ouvrir un fichier avec l'application par défaut
  ipcMain.handle('system:openFile', async (_, filePath) => {
    await shell.openPath(filePath)
    return { success: true }
  })

  // ─── Historique des rapports ──────────────────────────────────────────

  ipcMain.handle('report:addToHistory', async (_, entry) => {
    const history = store.get('reportHistory', [])
    const newEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      date: new Date().toISOString(),
      ...entry,
    }
    // Prépend et limite à HISTORY_MAX entrées
    const updated = [newEntry, ...history].slice(0, HISTORY_MAX)
    store.set('reportHistory', updated)
    return { success: true, id: newEntry.id }
  })

  ipcMain.handle('report:getHistory', async () => {
    const history = store.get('reportHistory', [])
    // Vérifier l'existence des fichiers sur le disque
    return history.map((entry) => ({
      ...entry,
      files: (entry.files || []).map((f) => ({
        ...f,
        exists: f.path ? fs.existsSync(f.path) : false,
      })),
    }))
  })

  ipcMain.handle('report:getHistoryByPlan', async (_, planId) => {
    const history = store.get('reportHistory', [])
    return history
      .filter((e) => String(e.planId) === String(planId))
      .map((entry) => ({
        ...entry,
        files: (entry.files || []).map((f) => ({
          ...f,
          exists: f.path ? fs.existsSync(f.path) : false,
        })),
      }))
  })

  ipcMain.handle('report:deleteFromHistory', async (_, id) => {
    const history = store.get('reportHistory', [])
    store.set('reportHistory', history.filter((e) => e.id !== id))
    return { success: true }
  })

  ipcMain.handle('report:clearHistory', async () => {
    store.set('reportHistory', [])
    return { success: true }
  })
}

module.exports = { register }
