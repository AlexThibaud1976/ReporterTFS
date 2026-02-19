const { contextBridge, ipcRenderer } = require('electron')

/**
 * API exposée au processus renderer via window.electronAPI
 * Principe : le renderer ne peut PAS accéder à Node.js directement.
 * Tout passe par ce bridge sécurisé.
 */
contextBridge.exposeInMainWorld('electronAPI', {

  // ─── Authentification ─────────────────────────────────────────────────
  auth: {
    saveConnection: (config) => ipcRenderer.invoke('auth:saveConnection', config),
    loadConnection: (name) => ipcRenderer.invoke('auth:loadConnection', name),
    deleteConnection: (name) => ipcRenderer.invoke('auth:deleteConnection', name),
    listConnections: () => ipcRenderer.invoke('auth:listConnections'),
    testConnection: (config) => ipcRenderer.invoke('auth:testConnection', config),
    disconnect: () => ipcRenderer.invoke('auth:disconnect'),
  },

  // ─── Azure DevOps API ─────────────────────────────────────────────────
  ado: {
    getProjects: () => ipcRenderer.invoke('ado:getProjects'),
    getTestPlans: (project) => ipcRenderer.invoke('ado:getTestPlans', project),
    getTestSuites: (project, planId) => ipcRenderer.invoke('ado:getTestSuites', project, planId),
    getTestCases: (project, planId, suiteId) => ipcRenderer.invoke('ado:getTestCases', project, planId, suiteId),
    getTestRuns: (project, planId) => ipcRenderer.invoke('ado:getTestRuns', project, planId),
    getTestResults: (project, runId) => ipcRenderer.invoke('ado:getTestResults', project, runId),
    getWorkItem: (project, id) => ipcRenderer.invoke('ado:getWorkItem', project, id),
    getFullPlanData: (project, planId, options) => ipcRenderer.invoke('ado:getFullPlanData', project, planId, options),
  },

  // ─── Exports ──────────────────────────────────────────────────────────
  export: {
    toPdf: (data, outputPath) => ipcRenderer.invoke('export:toPdf', data, outputPath),
    toExcel: (data, outputPath) => ipcRenderer.invoke('export:toExcel', data, outputPath),
    toPptx: (data, outputPath) => ipcRenderer.invoke('export:toPptx', data, outputPath),
    toHtml: (data, outputPath) => ipcRenderer.invoke('export:toHtml', data, outputPath),
    chooseOutputPath: (defaultName) => ipcRenderer.invoke('export:chooseOutputPath', defaultName),
  },

  // ─── Planification ────────────────────────────────────────────────────
  schedule: {
    create: (config) => ipcRenderer.invoke('schedule:create', config),
    list: () => ipcRenderer.invoke('schedule:list'),
    delete: (id) => ipcRenderer.invoke('schedule:delete', id),
    toggle: (id) => ipcRenderer.invoke('schedule:toggle', id),
    onRan: (callback) => ipcRenderer.on('schedule:ran', (_, data) => callback(data)),
  },

  // ─── Email ────────────────────────────────────────────────────────────
  email: {
    sendReport: (config) => ipcRenderer.invoke('email:sendReport', config),
    testSmtp: (config) => ipcRenderer.invoke('email:testSmtp', config),
    saveConfig: (config) => ipcRenderer.invoke('email:saveConfig', config),
    loadConfig: () => ipcRenderer.invoke('email:loadConfig'),
  },

  // ─── Template de rapport ──────────────────────────────────────────────
  template: {
    save: (config) => ipcRenderer.invoke('template:save', config),
    load: () => ipcRenderer.invoke('template:load'),
    chooseLogo: () => ipcRenderer.invoke('template:chooseLogo'),
  },
  // ─── Historique des rapports ──────────────────────────────────────────────
  reportHistory: {
    add:           (entry) => ipcRenderer.invoke('report:addToHistory', entry),
    getAll:        ()      => ipcRenderer.invoke('report:getHistory'),
    getByPlan:     (planId)=> ipcRenderer.invoke('report:getHistoryByPlan', planId),
    delete:        (id)    => ipcRenderer.invoke('report:deleteFromHistory', id),
    clear:         ()      => ipcRenderer.invoke('report:clearHistory'),
  },
  // ─── Système ──────────────────────────────────────────────────────────
  system: {
    openFile: (path) => ipcRenderer.invoke('system:openFile', path),
    getVersion: () => ipcRenderer.invoke('system:getVersion'),
    onUpdateAvailable: (callback) => ipcRenderer.on('update:available', callback),
  },
})
