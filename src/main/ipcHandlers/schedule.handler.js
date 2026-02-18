const emailService = require('../services/EmailService')
const scheduleService = require('../services/ScheduleService')
const { store } = require('../store/store')

/**
 * Handlers IPC pour la planification — Phase 4
 * Couvre : plannings périodiques, envoi email SMTP, templates de rapport.
 */
function register(ipcMain) {

  // ─── Planification ──────────────────────────────────────────────────────

  ipcMain.handle('schedule:list', async () => {
    return scheduleService.list()
  })

  ipcMain.handle('schedule:create', async (_, config) => {
    return scheduleService.create(config)
  })

  ipcMain.handle('schedule:delete', async (_, id) => {
    return scheduleService.delete(id)
  })

  ipcMain.handle('schedule:toggle', async (_, id) => {
    return scheduleService.toggle(id)
  })

  // ─── Email ───────────────────────────────────────────────────────────────

  ipcMain.handle('email:testSmtp', async (_, config) => {
    return emailService.testConnection(config)
  })

  ipcMain.handle('email:sendReport', async (_, config) => {
    return emailService.sendReport(config)
  })

  ipcMain.handle('email:saveConfig', async (_, config) => {
    return emailService.saveConfig(config)
  })

  ipcMain.handle('email:loadConfig', async () => {
    return emailService.loadConfig()
  })

  // ─── Templates de rapport ─────────────────────────────────────────────

  ipcMain.handle('template:save', async (_, config) => {
    store.set('reportTemplate', config)
    return { success: true }
  })

  ipcMain.handle('template:load', async () => {
    return store.get('reportTemplate', {
      accentColor: '#1e66f5',
      orgName: '',
      footerText: '',
      logoPath: '',
    })
  })

  ipcMain.handle('template:chooseLogo', async () => {
    const { dialog } = require('electron')
    const { filePaths } = await dialog.showOpenDialog({
      title: 'Sélectionner un logo',
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'svg', 'ico'] }],
      properties: ['openFile'],
    })
    return filePaths?.[0] || null
  })

  // ─── Système ─────────────────────────────────────────────────────────────

  ipcMain.handle('system:getVersion', async () => {
    const { app } = require('electron')
    return app.getVersion()
  })
}

module.exports = { register, scheduleService }
