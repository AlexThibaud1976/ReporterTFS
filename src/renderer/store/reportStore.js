import { create } from 'zustand'

/**
 * Store rapport — gère les métadonnées et le statut du rapport en cours de génération
 */
export const useReportStore = create((set, get) => ({
  // ─── Métadonnées du rapport (14 champs) ───────────────────────────────────
  metadata: {
    projectRef: '',
    changeNumber: '',
    itContact: '',
    businessContact: '',
    functionalDomain: '',
    applicationName: '',
    applicationVersion: '',
    testEnvironment: '',
    testScope: '',
    startDate: null,
    endDate: null,
    testers: '',
    approver: '',
    globalStatus: 'En cours', // Réussi | Échoué | En cours
  },

  // ─── Templates de métadonnées sauvegardés ────────────────────────────────
  metadataTemplates: [],

  // ─── Export en cours ──────────────────────────────────────────────────────
  exportProgress: {
    isExporting: false,
    step: '',
    progress: 0,
    lastExportPath: null,
    generatedFiles: [],   // tous les chemins de fichiers générés avec succès
    error: null,
  },

  // ─── Actions ─────────────────────────────────────────────────────────────

  updateMetadata: (field, value) => {
    set((state) => ({
      metadata: { ...state.metadata, [field]: value },
    }))
  },

  setMetadata: (metadata) => {
    set({ metadata: { ...get().metadata, ...metadata } })
  },

  resetMetadata: () => {
    set({
      metadata: {
        projectRef: '',
        changeNumber: '',
        itContact: '',
        businessContact: '',
        functionalDomain: '',
        applicationName: '',
        applicationVersion: '',
        testEnvironment: '',
        testScope: '',
        startDate: null,
        endDate: null,
        testers: '',
        approver: '',
        globalStatus: 'En cours',
      },
    })
  },

  // Validation : vérifie que les champs obligatoires sont remplis
  validateMetadata: () => {
    const { metadata } = get()
    const required = ['projectRef', 'applicationName', 'testEnvironment', 'testers']
    const missing = required.filter((f) => !metadata[f])
    return { valid: missing.length === 0, missing }
  },

  setExportProgress: (progress) => {
    set((state) => ({
      exportProgress: { ...state.exportProgress, ...progress },
    }))
  },

  resetExportProgress: () => {
    set({
      exportProgress: {
        isExporting: false,
        step: '',
        progress: 0,
        lastExportPath: null,
        generatedFiles: [],
        error: null,
      },
    })
  },
}))
