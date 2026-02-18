const schedule = require('node-schedule')
const path = require('path')
const os = require('os')
const fs = require('fs')
const { store } = require('../store/store')

/**
 * ScheduleService — Exports périodiques automatiques
 * Utilise node-schedule pour déclencher les exports + envoi email à intervals réguliers.
 */
class ScheduleService {
  constructor() {
    /** @type {Map<string, schedule.Job>} */
    this.jobs = new Map()
    this.mainWindow = null
  }

  /**
   * Initialise le service au démarrage de l'app.
   * Restaure tous les plannings actifs sauvegardés dans le store.
   * @param {Electron.BrowserWindow} mainWindow
   */
  init(mainWindow) {
    this.mainWindow = mainWindow
    const schedules = store.get('schedules', [])
    const active = schedules.filter((s) => s.active)
    console.log(`[ScheduleService] Démarrage — ${active.length} planning(s) actif(s)`)
    active.forEach((s) => this._startJob(s))
  }

  /**
   * Crée un nouveau planning et le démarre immédiatement s'il est actif.
   * @param {object} config
   * @returns {{id: string}}
   */
  create(config) {
    const schedules = store.get('schedules', [])
    const id = Date.now().toString()
    const newSchedule = {
      id,
      ...config,
      active: true,
      createdAt: new Date().toISOString(),
      lastRunAt: null,
      lastRunStatus: null,
    }
    schedules.push(newSchedule)
    store.set('schedules', schedules)

    if (newSchedule.active) {
      this._startJob(newSchedule)
    }
    return { success: true, id }
  }

  /**
   * Supprime un planning et arrête son job.
   * @param {string} id
   */
  delete(id) {
    this._stopJob(id)
    const schedules = store.get('schedules', []).filter((s) => s.id !== id)
    store.set('schedules', schedules)
    return { success: true }
  }

  /**
   * Active ou désactive un planning.
   * @param {string} id
   */
  toggle(id) {
    const schedules = store.get('schedules', [])
    const idx = schedules.findIndex((s) => s.id === id)
    if (idx === -1) return { success: false, message: 'Planning introuvable' }

    schedules[idx].active = !schedules[idx].active
    store.set('schedules', schedules)

    if (schedules[idx].active) {
      this._startJob(schedules[idx])
    } else {
      this._stopJob(id)
    }
    return { success: true, active: schedules[idx].active }
  }

  /**
   * Liste tous les plannings avec leur prochain déclenchement.
   */
  list() {
    const schedules = store.get('schedules', [])
    return schedules.map((s) => ({
      ...s,
      nextRun: this.jobs.has(s.id)
        ? this.jobs.get(s.id).nextInvocation()?.toISOString() || null
        : null,
    }))
  }

  // ─── Privé ────────────────────────────────────────────────────────────────

  /**
   * Convertit une config en expression cron node-schedule
   * @private
   */
  _buildCronRule(config) {
    const hour = parseInt(config.hour || '8', 10)
    const minute = parseInt(config.minute || '0', 10)

    switch (config.frequency) {
      case 'daily':
        return new schedule.RecurrenceRule(null, null, null, null, hour, minute, 0)
      case 'weekly': {
        const rule = new schedule.RecurrenceRule()
        rule.dayOfWeek = config.dayOfWeek ?? 1  // 1 = Lundi
        rule.hour = hour
        rule.minute = minute
        rule.second = 0
        return rule
      }
      case 'monthly': {
        const rule = new schedule.RecurrenceRule()
        rule.date = config.dayOfMonth ?? 1
        rule.hour = hour
        rule.minute = minute
        rule.second = 0
        return rule
      }
      default:
        return null
    }
  }

  /**
   * Démarre le job node-schedule pour un planning donné.
   * @private
   */
  _startJob(config) {
    const rule = this._buildCronRule(config)
    if (!rule) return

    const job = schedule.scheduleJob(rule, async () => {
      console.log(`[ScheduleService] Déclenchement du planning "${config.name || config.id}"`)
      await this._runScheduledTask(config)
    })

    if (job) {
      this.jobs.set(config.id, job)
      console.log(`[ScheduleService] Job "${config.name || config.id}" planifié, prochain : ${job.nextInvocation()}`)
    }
  }

  /**
   * Arrête un job en cours.
   * @private
   */
  _stopJob(id) {
    const job = this.jobs.get(id)
    if (job) {
      job.cancel()
      this.jobs.delete(id)
    }
  }

  /**
   * Exécute la tâche planifiée : génération du rapport + envoi email.
   * @private
   */
  async _runScheduledTask(config) {
    const startedAt = new Date().toISOString()
    try {
      // ── 1. Récupérer les données ADO ────────────────────────────────────
      const adoService = require('./AdoService')
      const { project, planId } = config.testPlanConfig || {}
      if (!project || !planId) throw new Error('Configuration du plan de test manquante')

      const planData = await adoService.getFullPlanData(project, planId)
      const reportData = { metadata: config.metadata || {}, planData }

      // ── 2. Générer les exports dans un dossier temporaire ───────────────
      const tmpDir = path.join(os.tmpdir(), `tfsreporter-${Date.now()}`)
      fs.mkdirSync(tmpDir, { recursive: true })

      const attachments = []
      const formats = config.formats || ['pdf']
      const dateStr = new Date().toISOString().replace('T', '_').replace(/:/g, '-').split('.')[0]
      const baseName = `TFSReport_${config.metadata?.projectRef || 'rapport'}_${dateStr}`

      for (const format of formats) {
        const ext = format === 'pptx' ? 'pptx' : format
        const outPath = path.join(tmpDir, `${baseName}.${ext}`)

        if (format === 'pdf') {
          const PdfService = require('./PdfService')
          await PdfService.generate(reportData, outPath)
        } else if (format === 'excel') {
          const ExcelService = require('./ExcelService')
          await ExcelService.generate(reportData, outPath)
        } else if (format === 'pptx') {
          const PptxService = require('./PptxService')
          await PptxService.generate(reportData, outPath)
        } else if (format === 'html') {
          const HtmlService = require('./HtmlService')
          await HtmlService.generate(reportData, outPath)
        }

        if (fs.existsSync(outPath)) attachments.push(outPath)
      }

      // ── 3. Envoyer l'email ──────────────────────────────────────────────
      const emailService = require('./EmailService')
      const smtpConfig = emailService.loadConfig()

      if (smtpConfig.host && config.recipients) {
        const recipients = config.recipients
          .split(/[;,]/)
          .map((r) => r.trim())
          .filter(Boolean)

        const planName = planData.plan?.name || planId
        await emailService.sendReport({
          smtp: smtpConfig,
          to: recipients,
          subject: `[TFSReporter] ${planName} — Rapport du ${dateStr}`,
          body: this._buildEmailBody(planData, dateStr),
          attachments,
        })
      }

      // ── 4. Nettoyer les fichiers temporaires ────────────────────────────
      this._cleanupTmpDir(tmpDir)

      // ── 5. Mettre à jour le store avec le résultat ──────────────────────
      this._updateScheduleStatus(config.id, startedAt, 'success', null)
      this._notifyRenderer('schedule:ran', { id: config.id, status: 'success' })

    } catch (err) {
      console.error(`[ScheduleService] Erreur tâche planifiée "${config.id}" :`, err.message)
      this._updateScheduleStatus(config.id, startedAt, 'error', err.message)
      this._notifyRenderer('schedule:ran', { id: config.id, status: 'error', message: err.message })
    }
  }

  /**
   * Met à jour le statut de dernière exécution dans le store.
   * @private
   */
  _updateScheduleStatus(id, runAt, status, error) {
    const schedules = store.get('schedules', [])
    const idx = schedules.findIndex((s) => s.id === id)
    if (idx !== -1) {
      schedules[idx].lastRunAt = runAt
      schedules[idx].lastRunStatus = status
      schedules[idx].lastRunError = error
      store.set('schedules', schedules)
    }
  }

  /**
   * Envoie une notification IPC au renderer (si fenêtre disponible).
   * @private
   */
  _notifyRenderer(channel, data) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, data)
    }
  }

  /**
   * Supprime un dossier temporaire.
   * @private
   */
  _cleanupTmpDir(dir) {
    try {
      fs.rmSync(dir, { recursive: true, force: true })
    } catch (_) {}
  }

  /**
   * Génère un corps HTML d'email récapitulatif.
   * @private
   */
  _buildEmailBody(planData, dateStr) {
    const m = planData.metrics || {}
    return `
      <html><body style="font-family: Arial, sans-serif; color: #333; padding: 24px; max-width: 600px;">
        <h2 style="color: #1e66f5; margin-bottom: 4px;">Rapport automatique TFSReporter</h2>
        <p style="color: #888; margin-top: 0;">${dateStr}</p>
        <table style="width:100%; border-collapse:collapse; margin: 16px 0;">
          <tr style="background:#f5f5f5;">
            <th style="padding:8px; text-align:left; border:1px solid #ddd;">Métrique</th>
            <th style="padding:8px; text-align:center; border:1px solid #ddd;">Valeur</th>
          </tr>
          <tr>
            <td style="padding:8px; border:1px solid #ddd;">Plan de test</td>
            <td style="padding:8px; text-align:center; border:1px solid #ddd;">${planData.plan?.name || '—'}</td>
          </tr>
          <tr>
            <td style="padding:8px; border:1px solid #ddd;">Total tests</td>
            <td style="padding:8px; text-align:center; border:1px solid #ddd;">${m.total || 0}</td>
          </tr>
          <tr>
            <td style="padding:8px; border:1px solid #ddd;">Taux de réussite</td>
            <td style="padding:8px; text-align:center; border:1px solid #ddd; color: ${(m.passRate || 0) >= 80 ? 'green' : 'red'}; font-weight:bold;">
              ${m.passRate || 0}%
            </td>
          </tr>
          <tr>
            <td style="padding:8px; border:1px solid #ddd;">Réussis</td>
            <td style="padding:8px; text-align:center; border:1px solid #ddd; color:green;">${m.passed || 0}</td>
          </tr>
          <tr>
            <td style="padding:8px; border:1px solid #ddd;">Échoués</td>
            <td style="padding:8px; text-align:center; border:1px solid #ddd; color:red;">${m.failed || 0}</td>
          </tr>
          ${(m.alertTriggered) ? `
          <tr>
            <td colspan="2" style="padding:8px; border:1px solid #ddd; background:#fff3cd; color:#856404; font-weight:bold;">
              ⚠️ Alerte qualité : taux de réussite inférieur à 80%
            </td>
          </tr>` : ''}
        </table>
        <p style="font-size:12px; color:#aaa;">Rapport joint en pièce(s) jointe(s). Envoyé automatiquement par TFSReporter.</p>
      </body></html>
    `
  }
}

module.exports = new ScheduleService()
