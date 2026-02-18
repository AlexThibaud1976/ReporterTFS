const { store } = require('../store/store')

/**
 * Handlers IPC pour la planification (Phase 4)
 * Implémentation complète avec node-schedule dans la Phase 4
 */
function register(ipcMain) {
  ipcMain.handle('schedule:list', async () => {
    return store.get('schedules', [])
  })

  ipcMain.handle('schedule:create', async (_, config) => {
    const schedules = store.get('schedules', [])
    const newSchedule = {
      id: Date.now().toString(),
      ...config,
      createdAt: new Date().toISOString(),
      active: true,
    }
    schedules.push(newSchedule)
    store.set('schedules', schedules)
    return { success: true, id: newSchedule.id }
  })

  ipcMain.handle('schedule:delete', async (_, id) => {
    const schedules = store.get('schedules', [])
    store.set('schedules', schedules.filter((s) => s.id !== id))
    return { success: true }
  })

  ipcMain.handle('email:testSmtp', async (_, config) => {
    // Sera implémenté en Phase 4 avec Nodemailer
    return { success: false, message: 'Fonctionnalité disponible en Phase 4' }
  })

  ipcMain.handle('email:sendReport', async (_, config) => {
    // Sera implémenté en Phase 4 avec Nodemailer
    return { success: false, message: 'Fonctionnalité disponible en Phase 4' }
  })

  ipcMain.handle('system:getVersion', async () => {
    const { app } = require('electron')
    return app.getVersion()
  })
}

module.exports = { register }
