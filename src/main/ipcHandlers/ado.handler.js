const adoService = require('../services/AdoService')

/**
 * Handlers IPC pour les appels Azure DevOps API
 */
function register(ipcMain) {
  ipcMain.handle('ado:getProjects', async () => {
    return adoService.getProjects()
  })

  ipcMain.handle('ado:getTestPlans', async (_, project) => {
    return adoService.getTestPlans(project)
  })

  ipcMain.handle('ado:getTestSuites', async (_, project, planId) => {
    return adoService.getTestSuites(project, planId)
  })

  ipcMain.handle('ado:getTestCases', async (_, project, planId, suiteId) => {
    return adoService.getTestCases(project, planId, suiteId)
  })

  ipcMain.handle('ado:getTestRuns', async (_, project, planId) => {
    return adoService.getTestRuns(project, planId)
  })

  ipcMain.handle('ado:getTestResults', async (_, project, runId) => {
    return adoService.getTestResults(project, runId)
  })

  ipcMain.handle('ado:getWorkItem', async (_, project, id) => {
    return adoService.getWorkItem(project, id)
  })

  ipcMain.handle('ado:getFullPlanData', async (_, project, planId, options = {}) => {
    return adoService.getFullPlanData(project, planId, options)
  })
}

module.exports = { register }
