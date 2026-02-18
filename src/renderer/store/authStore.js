import { create } from 'zustand'
import { authApi } from '../api/ipcApi'

/**
 * Store d'authentification — gère la connexion active et la liste des connexions
 */
export const useAuthStore = create((set, get) => ({
  // ─── State ───────────────────────────────────────────────────────────────
  connections: [],
  activeConnection: null,
  isConnected: false,
  isLoading: false,
  error: null,

  // ─── Actions ─────────────────────────────────────────────────────────────

  /**
   * Charge la liste des connexions sauvegardées
   */
  loadConnections: async () => {
    set({ isLoading: true, error: null })
    try {
      const connections = await authApi.listConnections()
      const active = await authApi.loadConnection(null)
      set({
        connections,
        activeConnection: active,
        isConnected: !!active,
        isLoading: false,
      })
    } catch (err) {
      set({ error: err.message, isLoading: false })
    }
  },

  /**
   * Teste et sauvegarde une nouvelle connexion
   */
  connectAndSave: async (config) => {
    set({ isLoading: true, error: null })
    try {
      // 1. Tester la connexion d'abord
      const testResult = await authApi.testConnection(config)
      if (!testResult.success) {
        set({ isLoading: false, error: testResult.message })
        return { success: false, message: testResult.message }
      }

      // 2. Sauvegarder si OK
      await authApi.saveConnection(config)

      // 3. Recharger
      const connections = await authApi.listConnections()
      const active = await authApi.loadConnection(config.name || config.organisation)

      set({
        connections,
        activeConnection: active,
        isConnected: true,
        isLoading: false,
        error: null,
      })

      return { success: true, message: testResult.message }
    } catch (err) {
      set({ error: err.message, isLoading: false, isConnected: false })
      return { success: false, message: err.message }
    }
  },

  /**
   * Change la connexion active
   */
  switchConnection: async (name) => {
    set({ isLoading: true })
    try {
      const active = await authApi.loadConnection(name)
      set({ activeConnection: active, isConnected: !!active, isLoading: false })
    } catch (err) {
      set({ error: err.message, isLoading: false })
    }
  },

  /**
   * Supprime une connexion
   */
  deleteConnection: async (name) => {
    await authApi.deleteConnection(name)
    await get().loadConnections()
  },

  /**
   * Déconnexion (ne supprime pas, juste réinitialise l'état)
   */
  disconnect: () => {
    set({ activeConnection: null, isConnected: false })
  },

  clearError: () => set({ error: null }),
}))
