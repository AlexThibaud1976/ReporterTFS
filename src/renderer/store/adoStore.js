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
  availableSuites: [],     // Suites du plan sélectionné (chargées dès la sélection du plan)
  selectedSuiteIds: [],    // IDs des suites sélectionnées (vide = toutes)
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
      availableSuites: [],
      selectedSuiteIds: [],
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

  selectPlan: async (plan) => {
    const { selectedProject } = get()
    set({ selectedPlan: plan, availableSuites: [], selectedSuiteIds: [], fullPlanData: null, loadingStep: 'Chargement des suites...', isLoading: true })
    try {
      const suites = await adoApi.getTestSuites(selectedProject.name, plan.id)
      // Exclure la suite racine (sans testCaseCount et sans parent = root)
      const leafSuites = suites.filter(s => s.parentSuiteId != null)
      set({ availableSuites: leafSuites.length > 0 ? leafSuites : suites, isLoading: false, loadingStep: '' })
    } catch (err) {
      set({ availableSuites: [], isLoading: false, loadingStep: '' })
    }
  },

  setSuiteFilter: (suiteIds) => {
    set({ selectedSuiteIds: suiteIds, fullPlanData: null })
  },

  /**
   * Extraction complète des données d'un plan (peut prendre 30-60s)
   */
  extractFullPlanData: async () => {
    const { selectedProject, selectedPlan, selectedSuiteIds } = get()
    if (!selectedProject || !selectedPlan) return

    const scopeLabel = selectedSuiteIds.length > 0
      ? `${selectedSuiteIds.length} suite(s) sélectionnée(s)`
      : 'toutes les suites'

    set({
      isLoading: true,
      loadingStep: `Extraction du plan "${selectedPlan.name}" (${scopeLabel})...`,
      fullPlanData: null,
      error: null,
    })

    try {
      const options = selectedSuiteIds.length > 0 ? { suiteIds: selectedSuiteIds } : {}
      const data = await adoApi.getFullPlanData(selectedProject.name, selectedPlan.id, options)
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
      availableSuites: [],
      selectedSuiteIds: [],
      fullPlanData: null,
      isLoading: false,
      loadingStep: '',
      error: null,
    })
  },

  clearError: () => set({ error: null }),
}))
