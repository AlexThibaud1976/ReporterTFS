const Store = require('electron-store')
const { safeStorage } = require('electron')

/**
 * Store principal de l'application.
 * Les PAT sont chiffrés via electron.safeStorage avant stockage.
 */
const store = new Store({
  name: 'tfsreporter-config',
  encryptionKey: 'tfsreporter-salt-v1', // Obfuscation légère pour les données non-sensibles
  schema: {
    connections: {
      type: 'array',
      default: [],
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          organisation: { type: 'string' },
          project: { type: 'string' },
          encryptedPat: { type: 'string' },
          apiVersion: { type: 'string' },
          lastUsed: { type: 'string' },
        },
        required: ['name', 'organisation', 'encryptedPat'],
      },
    },
    activeConnectionName: {
      type: 'string',
      default: '',
    },
    metadataTemplates: {
      type: 'array',
      default: [],
    },
    emailConfig: {
      type: 'object',
      default: {},
    },
    schedules: {
      type: 'array',
      default: [],
    },
    appSettings: {
      type: 'object',
      default: {
        theme: 'dark',
        language: 'fr',
        defaultExportPath: '',
        alertThreshold: 80,
      },
    },
    reportTemplate: {
      type: 'object',
      default: {
        accentColor: '#1e66f5',
        orgName: '',
        footerText: '',
        logoPath: '',
      },
    },
    reportHistory: {
      type: 'array',
      default: [],
      items: {
        type: 'object',
        properties: {
          id:          { type: 'string' },
          date:        { type: 'string' },
          planId:      { type: 'string' },
          planName:    { type: 'string' },
          project:     { type: 'string' },
          passRate:    { type: 'number' },
          totalTests:  { type: 'number' },
          globalStatus:{ type: 'string' },
          projectRef:  { type: 'string' },
          appName:     { type: 'string' },
          appVersion:  { type: 'string' },
          formats:     { type: 'array', items: { type: 'string' } },
          files:       { type: 'array', items: { type: 'object' } },
        },
      },
    },
  },
})

// ─── Helpers chiffrement PAT ───────────────────────────────────────────────

/**
 * Chiffre un PAT avec electron.safeStorage (lié à l'OS)
 * @param {string} pat - Le token en clair
 * @returns {string} PAT chiffré encodé en base64
 */
function encryptPat(pat) {
  if (!safeStorage.isEncryptionAvailable()) {
    // Fallback : retourner en base64 simple (développement)
    console.warn('[Store] safeStorage non disponible, fallback base64')
    return Buffer.from(pat).toString('base64')
  }
  const encrypted = safeStorage.encryptString(pat)
  return encrypted.toString('base64')
}

/**
 * Déchiffre un PAT
 * @param {string} encryptedPat - PAT chiffré en base64
 * @returns {string} PAT en clair
 */
function decryptPat(encryptedPat) {
  if (!safeStorage.isEncryptionAvailable()) {
    return Buffer.from(encryptedPat, 'base64').toString('utf8')
  }
  const buffer = Buffer.from(encryptedPat, 'base64')
  return safeStorage.decryptString(buffer)
}

module.exports = { store, encryptPat, decryptPat }
