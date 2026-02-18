/**
 * ipcApi — Abstraction des appels IPC côté renderer
 * Encapsule window.electronAPI pour centraliser la gestion d'erreurs
 */

const api = window.electronAPI

// ─── AUTH ──────────────────────────────────────────────────────────────────
export const authApi = {
  saveConnection: (config) => api.auth.saveConnection(config),
  loadConnection: (name) => api.auth.loadConnection(name),
  deleteConnection: (name) => api.auth.deleteConnection(name),
  listConnections: () => api.auth.listConnections(),
  testConnection: (config) => api.auth.testConnection(config),
}

// ─── ADO ───────────────────────────────────────────────────────────────────
export const adoApi = {
  getProjects: () => api.ado.getProjects(),
  getTestPlans: (project) => api.ado.getTestPlans(project),
  getTestSuites: (project, planId) => api.ado.getTestSuites(project, planId),
  getTestCases: (project, planId, suiteId) => api.ado.getTestCases(project, planId, suiteId),
  getTestRuns: (project, planId) => api.ado.getTestRuns(project, planId),
  getTestResults: (project, runId) => api.ado.getTestResults(project, runId),
  getWorkItem: (project, id) => api.ado.getWorkItem(project, id),
  getFullPlanData: (project, planId) => api.ado.getFullPlanData(project, planId),
}

// ─── EXPORT ────────────────────────────────────────────────────────────────
export const exportApi = {
  toPdf: (data, outputPath) => api.export.toPdf(data, outputPath),
  toExcel: (data, outputPath) => api.export.toExcel(data, outputPath),
  toPptx: (data, outputPath) => api.export.toPptx(data, outputPath),
  toHtml: (data, outputPath) => api.export.toHtml(data, outputPath),
  chooseOutputPath: (defaultName) => api.export.chooseOutputPath(defaultName),
}

// ─── SYSTEM ────────────────────────────────────────────────────────────────
export const systemApi = {
  openFile: (path) => api.system.openFile(path),
  getVersion: () => api.system.getVersion(),
}
