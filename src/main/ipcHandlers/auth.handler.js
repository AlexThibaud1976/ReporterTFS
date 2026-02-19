const authService = require('../services/AuthService')

/**
 * Handlers IPC pour l'authentification
 */
function register(ipcMain) {
  ipcMain.handle('auth:saveConnection', async (_, config) => {
    return authService.saveConnection(config)
  })

  ipcMain.handle('auth:loadConnection', async (_, name) => {
    if (name) {
      authService.setActiveConnection(name)
      return authService.loadConnection(name)
    }
    return authService.loadActiveConnection()
  })

  ipcMain.handle('auth:deleteConnection', async (_, name) => {
    return authService.deleteConnection(name)
  })

  ipcMain.handle('auth:listConnections', async () => {
    return authService.listConnections()
  })

  ipcMain.handle('auth:testConnection', async (_, config) => {
    return authService.testConnection(config)
  })

  ipcMain.handle('auth:disconnect', async () => {
    return authService.clearActiveConnection()
  })
}

module.exports = { register }
