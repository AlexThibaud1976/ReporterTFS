const nodemailer = require('nodemailer')
const path = require('path')
const { store } = require('../store/store')

/**
 * EmailService — Envoi d'emails via SMTP (Nodemailer)
 * Gère la configuration SMTP, le test de connexion et l'envoi des rapports.
 */
class EmailService {
  /**
   * Crée un transporteur Nodemailer à partir d'une config SMTP
   * @param {object} config - { host, port, user, password, tls }
   * @returns {nodemailer.Transporter}
   */
  _createTransporter(config) {
    const port = parseInt(config.port, 10) || 587
    const tlsEnabled = config.tls !== false
    return nodemailer.createTransport({
      host: config.host,
      port,
      secure: port === 465,
      auth: config.user
        ? { user: config.user, pass: config.password }
        : undefined,
      // Contrôle STARTTLS compatible nodemailer v8+
      requireTLS: tlsEnabled && port !== 465,  // Force STARTTLS sur ports non-SSL
      ignoreTLS: !tlsEnabled,                  // Désactive STARTTLS si TLS off
      tls: {
        rejectUnauthorized: false,  // On-premise : certificats auto-signés
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
    })
  }

  /**
   * Teste la connexion SMTP sans envoyer d'email
   * @param {object} config
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async testConnection(config) {
    try {
      const transporter = this._createTransporter(config)
      await transporter.verify()
      return { success: true, message: 'Connexion SMTP réussie ✓' }
    } catch (err) {
      return { success: false, message: `Erreur SMTP : ${err.message}` }
    }
  }

  /**
   * Envoie un rapport par email
   * @param {object} options
   * @param {object} options.smtp - Config SMTP
   * @param {string[]} options.to - Liste des destinataires
   * @param {string} options.subject - Sujet
   * @param {string} options.body - Corps HTML
   * @param {string[]} [options.attachments] - Chemins des fichiers à joindre
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async sendReport({ smtp, to, subject, body, attachments = [] }) {
    try {
      const transporter = this._createTransporter(smtp)

      const mailOptions = {
        from: smtp.from || smtp.user,
        to: Array.isArray(to) ? to.join(', ') : to,
        subject,
        html: body || this._defaultBodyHtml(subject),
        attachments: attachments
          .filter(Boolean)
          .map((filePath) => ({
            filename: path.basename(filePath),
            path: filePath,
          })),
      }

      const info = await transporter.sendMail(mailOptions)
      return { success: true, message: `Email envoyé (${info.messageId})` }
    } catch (err) {
      return { success: false, message: `Erreur envoi email : ${err.message}` }
    }
  }

  /**
   * Charge la config SMTP sauvegardée dans le store
   * @returns {object}
   */
  loadConfig() {
    return store.get('emailConfig', {
      host: '',
      port: '587',
      user: '',
      password: '',
      from: '',
      tls: true,
    })
  }

  /**
   * Sauvegarde la config SMTP dans le store
   * @param {object} config
   */
  saveConfig(config) {
    store.set('emailConfig', config)
    return { success: true }
  }

  // ─── Helpers privés ───────────────────────────────────────────────────────

  _defaultBodyHtml(subject) {
    return `
      <html><body style="font-family: Arial, sans-serif; color: #333; padding: 24px;">
        <h2 style="color: #1e66f5;">TFSReporter — Rapport automatique</h2>
        <p>${subject}</p>
        <p>Veuillez trouver le rapport en pièce jointe.</p>
        <hr style="border-color:#eee; margin: 24px 0;">
        <p style="font-size: 12px; color: #888;">Envoyé automatiquement par TFSReporter</p>
      </body></html>
    `
  }
}

module.exports = new EmailService()
