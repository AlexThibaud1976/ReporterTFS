import { create } from 'zustand'
import { adoApi } from '../api/ipcApi'

/**
 * Store ADO — gère les données extraites d'Azure DevOps
 */
export const useAdoStore = create((set, get) => ({
  // ─── State ───────────────────────────────────────────────────────────────
  projects: [],
  selectedProject: null,
  testPlans: [],
  selectedPlan: null,
  fullPlanData: null,
  isLoading: false,
  loadingStep: '',  // Message décrivant l'étape en cours
  error: null,

  // ─── Actions ─────────────────────────────────────────────────────────────

  loadProjects: async () => {
    set({ isLoading: true, loadingStep: 'Chargement des projets...', error: null })
    try {
      const projects = await adoApi.getProjects()
      set({ projects, isLoading: false, loadingStep: '' })
    } catch (err) {
      set({ error: err.message, isLoading: false, loadingStep: '' })
    }
  },

  selectProject: async (project) => {
    set({
      selectedProject: project,
      testPlans: [],
      selectedPlan: null,
      fullPlanData: null,
      isLoading: true,
      loadingStep: `Chargement des plans de test pour "${project.name}"...`,
      error: null,
    })
    try {
      const testPlans = await adoApi.getTestPlans(project.name)
      set({ testPlans, isLoading: false, loadingStep: '' })
    } catch (err) {
      set({ error: err.message, isLoading: false, loadingStep: '' })
    }
  },

  selectPlan: (plan) => {
    set({ selectedPlan: plan, fullPlanData: null })
  },

  /**
   * Extraction complète des données d'un plan (peut prendre 30-60s)
   */
  extractFullPlanData: async () => {
    const { selectedProject, selectedPlan } = get()
    if (!selectedProject || !selectedPlan) return

    set({
      isLoading: true,
      loadingStep: `Extraction des données du plan "${selectedPlan.name}"...`,
      fullPlanData: null,
      error: null,
    })

    try {
      const data = await adoApi.getFullPlanData(selectedProject.name, selectedPlan.id)
      set({ fullPlanData: data, isLoading: false, loadingStep: '' })
      return data
    } catch (err) {
      set({ error: err.message, isLoading: false, loadingStep: '' })
      return null
    }
  },

  reset: () => {
    set({
      projects: [],
      selectedProject: null,
      testPlans: [],
      selectedPlan: null,
      fullPlanData: null,
      isLoading: false,
      loadingStep: '',
      error: null,
    })
  },

  clearError: () => set({ error: null }),
}))
