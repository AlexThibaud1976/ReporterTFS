const { dialog, shell } = require('electron')
const path = require('path')

/**
 * Handlers IPC pour les exports
 * Les services PDF/Excel/PPTX/HTML seront implémentés en Phase 3
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
}

module.exports = { register }
