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
  disconnect: () => api.auth.disconnect(),
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
  getFullPlanData: (project, planId, options) => api.ado.getFullPlanData(project, planId, options),
}

// ─── EXPORT ────────────────────────────────────────────────────────────────
export const exportApi = {
  toPdf: (data, outputPath) => api.export.toPdf(data, outputPath),
  toExcel: (data, outputPath) => api.export.toExcel(data, outputPath),
  toPptx: (data, outputPath) => api.export.toPptx(data, outputPath),
  toHtml: (data, outputPath) => api.export.toHtml(data, outputPath),
  chooseOutputPath: (defaultName) => api.export.chooseOutputPath(defaultName),
}

// ─── EMAIL ─────────────────────────────────────────────────────────────────
export const emailApi = {
  testSmtp: (config) => api.email.testSmtp(config),
  sendReport: (config) => api.email.sendReport(config),
  saveConfig: (config) => api.email.saveConfig(config),
  loadConfig: () => api.email.loadConfig(),
}

// ─── SCHEDULE ──────────────────────────────────────────────────────────────
export const scheduleApi = {
  create: (config) => api.schedule.create(config),
  list: () => api.schedule.list(),
  delete: (id) => api.schedule.delete(id),
  toggle: (id) => api.schedule.toggle(id),
  onRan: (callback) => api.schedule.onRan(callback),
}

// ─── TEMPLATE ──────────────────────────────────────────────────────────────
export const templateApi = {
  save: (config) => api.template.save(config),
  load: () => api.template.load(),
  chooseLogo: () => api.template.chooseLogo(),
}

// ─── SYSTEM ────────────────────────────────────────────────────────────────
export const systemApi = {
  openFile: (path) => api.system.openFile(path),
  getVersion: () => api.system.getVersion(),
}

// ─── REPORT HISTORY ─────────────────────────────────────────────────────
export const reportHistoryApi = {
  add:       (entry)  => api.reportHistory.add(entry),
  getAll:    ()       => api.reportHistory.getAll(),
  getByPlan: (planId) => api.reportHistory.getByPlan(planId),
  delete:    (id)     => api.reportHistory.delete(id),
  clear:     ()       => api.reportHistory.clear(),
}
