const axios = require('axios')
const https = require('https')
const { store, encryptPat, decryptPat } = require('../store/store')

// Agent HTTPS uniquement pour les serveurs on-premise avec certificats auto-signés
const onPremiseHttpsAgent = new https.Agent({ rejectUnauthorized: false })

/**
 * AuthService — Gestion des connexions Azure DevOps
 *
 * Supporte deux modes :
 *  - Cloud  : https://dev.azure.com/{organisation}
 *  - On-premise : http://monserveur:8080/tfs/{collection}
 */
class AuthService {

  // ─── Détection cloud vs on-premise ─────────────────────────────────────

  /**
   * Retourne true si l'organisation est hébergée sur Azure DevOps cloud.
   * Utilise un parsing d'URL strict pour éviter les contournements via substring.
   */
  isCloud(organisation) {
    if (!organisation.startsWith('http://') && !organisation.startsWith('https://')) {
      return true // Nom simple (ex: "BCEE-QA") → cloud
    }
    try {
      const url = new URL(organisation)
      return url.hostname === 'dev.azure.com'
    } catch {
      return true // URL malformée → traité comme cloud par défaut
    }
  }

  /**
   * Retourne l'agent HTTPS approprié selon le type de connexion :
   * - Cloud (dev.azure.com) : agent par défaut (validation SSL activée)
   * - On-premise : agent tolérant les certificats auto-signés
   */
  getHttpsAgent(baseUrl) {
    try {
      const url = new URL(baseUrl)
      if (url.hostname === 'dev.azure.com') {
        return undefined // Utilise la validation SSL par défaut
      }
    } catch {
      // URL invalide, on-premise par défaut
    }
    return onPremiseHttpsAgent
  }

  /**
   * Construit l'URL de base API selon le type (cloud ou on-premise)
   * Cloud      : https://dev.azure.com/{org}
   * On-premise : http://server:8080/tfs/{collection}
   */
  buildBaseUrl(organisation, apiVersion = '6.0') {
    const org = organisation.trim().replace(/\/$/, '')

    // Nom d'organisation simple (ex: "BCEE-QA") → cloud
    if (!org.startsWith('http://') && !org.startsWith('https://')) {
      return `https://dev.azure.com/${org}`
    }

    // URL complète : parsing strict pour identifier le cloud
    try {
      const url = new URL(org)
      if (url.hostname === 'dev.azure.com') {
        return org // Cloud confirmé
      }
    } catch {
      // URL malformée, on laisse passer tel quel
    }

    // On-premise ex: "http://monserveur:8080/tfs/DefaultCollection"
    return org
  }

  // ─── Sauvegarde ─────────────────────────────────────────────────────────

  saveConnection(config) {
    const { name, organisation, project, pat, apiVersion = '6.0' } = config

    if (!organisation || !pat) {
      throw new Error('Organisation et PAT sont requis')
    }

    const connections = store.get('connections', [])
    const connName = name || organisation
    const existingIndex = connections.findIndex((c) => c.name === connName)

    const connectionData = {
      name: connName,
      organisation: organisation.trim().replace(/\/$/, ''),
      project: project?.trim() || '',
      encryptedPat: encryptPat(pat),
      apiVersion,
      lastUsed: new Date().toISOString(),
    }

    if (existingIndex >= 0) {
      connections[existingIndex] = connectionData
    } else {
      connections.push(connectionData)
    }

    store.set('connections', connections)
    store.set('activeConnectionName', connName)
    return { success: true, name: connName }
  }

  // ─── Chargement ─────────────────────────────────────────────────────────

  loadActiveConnection() {
    const activeName = store.get('activeConnectionName', '')
    return this.loadConnection(activeName)
  }

  loadConnection(name) {
    const connections = store.get('connections', [])
    const conn = connections.find((c) => c.name === name)
    if (!conn) return null

    return {
      name: conn.name,
      organisation: conn.organisation,
      project: conn.project,
      pat: decryptPat(conn.encryptedPat),
      apiVersion: conn.apiVersion || '6.0',
      baseUrl: this.buildBaseUrl(conn.organisation),
      lastUsed: conn.lastUsed,
    }
  }

  listConnections() {
    const connections = store.get('connections', [])
    return connections.map(({ name, organisation, project, apiVersion, lastUsed }) => ({
      name, organisation, project, apiVersion, lastUsed,
    }))
  }

  deleteConnection(name) {
    const connections = store.get('connections', [])
    const filtered = connections.filter((c) => c.name !== name)
    store.set('connections', filtered)
    if (store.get('activeConnectionName') === name) {
      store.set('activeConnectionName', filtered[0]?.name || '')
    }
    return { success: true }
  }

  clearActiveConnection() {
    store.set('activeConnectionName', '')
    return { success: true }
  }

  setActiveConnection(name) {
    store.set('activeConnectionName', name)
  }

  // ─── Test de connexion ───────────────────────────────────────────────────

  async testConnection(config) {
    const { organisation, pat, apiVersion = '6.0' } = config
    const baseUrl = this.buildBaseUrl(organisation)
    const authHeader = `Basic ${Buffer.from(`:${pat}`).toString('base64')}`

    try {
      const response = await axios.get(`${baseUrl}/_apis/projects`, {
        params: { '$top': 1, 'api-version': apiVersion },
        headers: { Authorization: authHeader, Accept: 'application/json' },
        timeout: 10000,
        httpsAgent: this.getHttpsAgent(baseUrl),
      })

      return {
        success: true,
        message: `✅ Connexion réussie ! ${response.data.count} projet(s) trouvé(s).`,
        projectCount: response.data.count,
      }
    } catch (error) {
      if (error.response?.status === 401) {
        return { success: false, message: 'PAT invalide ou expiré. Vérifiez vos credentials.' }
      }
      if (error.response?.status === 403) {
        return { success: false, message: 'Accès refusé. Vérifiez les permissions du PAT (besoin : Test Management Read).' }
      }
      if (error.response?.status === 404) {
        return { success: false, message: `Organisation introuvable : "${organisation}". Vérifiez le nom exact dans votre URL ADO.` }
      }
      if (error.code === 'ECONNREFUSED') {
        return { success: false, message: `Impossible de joindre le serveur. Vérifiez l'URL et le réseau.` }
      }
      if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
        return { success: false, message: 'Timeout : le serveur ne répond pas dans les 10 secondes.' }
      }
      return { success: false, message: `Erreur : ${error.message}` }
    }
  }

  // ─── Helpers pour AdoService ─────────────────────────────────────────────

  buildAuthHeaders() {
    const conn = this.loadActiveConnection()
    if (!conn) throw new Error('Aucune connexion active. Veuillez vous connecter.')
    return {
      Authorization: `Basic ${Buffer.from(`:${conn.pat}`).toString('base64')}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    }
  }

  getBaseUrl() {
    const conn = this.loadActiveConnection()
    if (!conn) throw new Error('Aucune connexion active.')
    return conn.baseUrl
  }

  getApiVersion() {
    const conn = this.loadActiveConnection()
    return conn?.apiVersion || '6.0'
  }
}

module.exports = new AuthService()
