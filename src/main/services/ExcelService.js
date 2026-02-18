const ExcelJS = require('exceljs')

const COLORS = {
  headerDark:  '1A1A2E',
  primary:     '1E6FFF',
  green:       '22C55E',
  red:         'EF4444',
  yellow:      'F59E0B',
  orange:      'F97316',
  lightGrey:   'F3F4F6',
  border:      'E5E7EB',
  midGrey:     '6B7280',
  white:       'FFFFFF',
  darkText:    '111827',
}

const outcomeColor = (o) => ({
  Passed: COLORS.green, Failed: COLORS.red,
  Blocked: COLORS.yellow, NotExecuted: COLORS.midGrey,
})[o] || COLORS.midGrey

class ExcelService {

  async generate(data, outputPath) {
    try {
      const { metadata, planData } = data
      const { plan, metrics, results, suiteMetrics, history, runs, latestRun } = planData

      const wb = new ExcelJS.Workbook()
      wb.creator = 'TFSReporter'
      wb.created = new Date()
      wb.properties.date1904 = false

      this._sheetSummary(wb, metadata, metrics, plan, latestRun)
      this._sheetResults(wb, results)
      this._sheetSuites(wb, suiteMetrics)
      if (history && history.length > 0) this._sheetHistory(wb, history)
      const failed = results.filter(r => r.outcome === 'Failed')
      if (failed.length > 0) this._sheetFailed(wb, failed)

      await wb.xlsx.writeFile(outputPath)
      return { success: true, path: outputPath }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  // ─── Onglet 1 : Résumé ────────────────────────────────────────────────
  _sheetSummary(wb, metadata, metrics, plan, latestRun) {
    const ws = wb.addWorksheet('Résumé', { tabColor: { argb: 'FF1E6FFF' } })
    ws.columns = [
      { key: 'label', width: 30 },
      { key: 'value', width: 40 },
    ]

    const addTitle = (text) => {
      ws.addRow([])
      const r = ws.addRow([text])
      r.font = { bold: true, size: 13, color: { argb: 'FFFFFFFF' } }
      r.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + COLORS.headerDark } }
      r.height = 28
      ws.mergeCells(r.number, 1, r.number, 2)
    }

    const addRow = (label, value, bold = false, valueColor = null) => {
      const r = ws.addRow([label, value])
      r.getCell(1).font = { bold: true, size: 10, color: { argb: 'FF' + COLORS.darkText } }
      r.getCell(2).font = { bold, size: 10, color: { argb: 'FF' + (valueColor || COLORS.darkText) } }
      r.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + COLORS.lightGrey } }
      r.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } }
      r.getCell(1).border = { bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } } }
      r.getCell(2).border = { bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } } }
      r.height = 20
      return r
    }

    // En-tête principal
    const titleRow = ws.addRow(['RAPPORT DE TEST — ' + (metadata.applicationName || plan.name)])
    titleRow.font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } }
    titleRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + COLORS.primary } }
    titleRow.height = 36
    ws.mergeCells(1, 1, 1, 2)

    const dateRow = ws.addRow(['Généré le ' + new Date().toLocaleString('fr-FR') + ' par TFSReporter'])
    dateRow.font = { italic: true, size: 9, color: { argb: 'FF' + COLORS.midGrey } }
    ws.mergeCells(2, 1, 2, 2)

    // Informations projet
    addTitle('📋 Informations du rapport')
    addRow('Référence projet', metadata.projectRef)
    addRow('Numéro de change', metadata.changeNumber)
    addRow('Application', metadata.applicationName)
    addRow('Version', metadata.applicationVersion)
    addRow('Environnement', metadata.testEnvironment)
    addRow('Périmètre', metadata.testScope)
    addRow('Date début', metadata.startDate ? new Date(metadata.startDate).toLocaleDateString('fr-FR') : '')
    addRow('Date fin', metadata.endDate ? new Date(metadata.endDate).toLocaleDateString('fr-FR') : '')
    addRow('Testeur(s)', metadata.testers)
    addRow('Approbateur', metadata.approver)
    addRow('Contact IT', metadata.itContact)
    addRow('Contact Métier', metadata.businessContact)

    // Statut global
    const statusColor = { 'Réussi': COLORS.green, 'Échoué': COLORS.red, 'En cours': COLORS.yellow }[metadata.globalStatus] || COLORS.primary
    addRow('Statut global', metadata.globalStatus || 'En cours', true, statusColor)

    // Métriques
    addTitle('📊 Métriques de test')
    addRow('Plan de test', plan.name)
    addRow('Dernier run', latestRun ? latestRun.name : '—')
    addRow('Date d\'exécution', latestRun && latestRun.startedDate ? new Date(latestRun.startedDate).toLocaleString('fr-FR') : '—')
    addRow('Total tests', metrics.total, true)
    addRow('Tests réussis', metrics.passed, true, COLORS.green)
    addRow('Tests échoués', metrics.failed, true, metrics.failed > 0 ? COLORS.red : COLORS.green)
    addRow('Tests bloqués', metrics.blocked, true, metrics.blocked > 0 ? COLORS.yellow : COLORS.midGrey)
    addRow('Non exécutés', metrics.notExecuted, false, COLORS.midGrey)
    addRow('Taux de réussite', metrics.passRate + '%', true, metrics.passRate >= 80 ? COLORS.green : COLORS.red)
    addRow('Suites de test', metrics.suitesCount)
    addRow('Bugs liés', metrics.bugsCount, metrics.bugsCount > 0, metrics.bugsCount > 0 ? COLORS.red : COLORS.green)

    if (metrics.alertTriggered) {
      ws.addRow([])
      const alertRow = ws.addRow(['⚠ ALERTE : Taux de réussite (' + metrics.passRate + '%) inférieur au seuil de 80% — Action corrective requise'])
      alertRow.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } }
      alertRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEF4444' } }
      alertRow.height = 28
      ws.mergeCells(alertRow.number, 1, alertRow.number, 2)
    }
  }

  // ─── Onglet 2 : Tous les résultats ────────────────────────────────────
  _sheetResults(wb, results) {
    const ws = wb.addWorksheet('Résultats', { tabColor: { argb: 'FF22C55E' } })
    ws.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Cas de test', key: 'testCaseName', width: 40 },
      { header: 'Statut', key: 'outcome', width: 16 },
      { header: 'Durée (ms)', key: 'durationInMs', width: 14 },
      { header: 'Testeur', key: 'tester', width: 22 },
      { header: 'Date début', key: 'startedDate', width: 20 },
      { header: 'Message erreur', key: 'errorMessage', width: 55 },
      { header: 'Commentaire', key: 'comment', width: 30 },
    ]

    // Style entêtes
    const headerRow = ws.getRow(1)
    headerRow.height = 24
    ws.columns.forEach((_, i) => {
      const cell = headerRow.getCell(i + 1)
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + COLORS.headerDark } }
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 }
      cell.alignment = { vertical: 'middle', horizontal: 'center' }
      cell.border = { bottom: { style: 'medium', color: { argb: 'FF' + COLORS.primary } } }
    })

    results.forEach((r, i) => {
      const row = ws.addRow({
        id: r.testCaseId,
        testCaseName: r.testCaseName || ('TC-' + r.testCaseId),
        outcome: r.outcome,
        durationInMs: r.durationInMs || 0,
        tester: r.tester || '',
        startedDate: r.startedDate ? new Date(r.startedDate).toLocaleString('fr-FR') : '',
        errorMessage: r.errorMessage || '',
        comment: r.comment || '',
      })
      row.height = 18

      // Couleur statut
      const color = outcomeColor(r.outcome)
      const statusCell = row.getCell('outcome')
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + color } }
      statusCell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 9 }
      statusCell.alignment = { horizontal: 'center' }

      // Alternance lignes
      if (i % 2 === 0) {
        ['id', 'testCaseName', 'durationInMs', 'tester', 'startedDate', 'errorMessage', 'comment'].forEach(k => {
          row.getCell(k).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } }
        })
      }

      // Erreur en rouge
      if (r.errorMessage) {
        row.getCell('errorMessage').font = { color: { argb: 'FFEF4444' }, size: 9 }
      }
    })

    ws.autoFilter = { from: 'A1', to: ws.columns.length + 'A1' }
    ws.views = [{ state: 'frozen', ySplit: 1 }]
  }

  // ─── Onglet 3 : Résultats par suite ───────────────────────────────────
  _sheetSuites(wb, suiteMetrics) {
    const ws = wb.addWorksheet('Par Suite', { tabColor: { argb: 'FF3B82F6' } })
    ws.columns = [
      { header: 'Suite de test', key: 'suiteName', width: 40 },
      { header: 'Total', key: 'total', width: 10 },
      { header: 'Réussis', key: 'passed', width: 12 },
      { header: 'Échoués', key: 'failed', width: 12 },
      { header: 'Bloqués', key: 'blocked', width: 12 },
      { header: 'Non exécutés', key: 'notExecuted', width: 16 },
      { header: 'Taux réussite', key: 'passRate', width: 16 },
    ]

    const headerRow = ws.getRow(1)
    headerRow.height = 24
    ws.columns.forEach((_, i) => {
      const cell = headerRow.getCell(i + 1)
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + COLORS.headerDark } }
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 }
      cell.alignment = { vertical: 'middle', horizontal: 'center' }
    })

    if (!suiteMetrics) return

    suiteMetrics.forEach((sm, i) => {
      const row = ws.addRow({
        suiteName: sm.suiteName || ('Suite ' + sm.suiteId),
        total: sm.total,
        passed: sm.passed,
        failed: sm.failed,
        blocked: sm.blocked,
        notExecuted: sm.notExecuted,
        passRate: sm.passRate / 100,
      })
      row.height = 20

      if (i % 2 === 0) row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } }

      row.getCell('passed').font = { color: { argb: 'FF' + COLORS.green }, bold: true }
      if (sm.failed > 0) row.getCell('failed').font = { color: { argb: 'FF' + COLORS.red }, bold: true }
      if (sm.blocked > 0) row.getCell('blocked').font = { color: { argb: 'FF' + COLORS.yellow }, bold: true }

      const rateCell = row.getCell('passRate')
      rateCell.numFmt = '0%'
      rateCell.font = { bold: true, color: { argb: 'FF' + (sm.passRate >= 80 ? COLORS.green : COLORS.red) } }
    })

    ws.views = [{ state: 'frozen', ySplit: 1 }]
  }

  // ─── Onglet 4 : Historique ────────────────────────────────────────────
  _sheetHistory(wb, history) {
    const ws = wb.addWorksheet('Historique', { tabColor: { argb: 'FFF97316' } })
    ws.columns = [
      { header: 'Run', key: 'runName', width: 35 },
      { header: 'Date', key: 'date', width: 18 },
      { header: 'Total', key: 'total', width: 10 },
      { header: 'Réussis', key: 'passed', width: 12 },
      { header: 'Échoués', key: 'failed', width: 12 },
      { header: 'Taux réussite', key: 'passRate', width: 16 },
      { header: 'Tendance', key: 'trend', width: 12 },
    ]

    const headerRow = ws.getRow(1)
    headerRow.height = 24
    ws.columns.forEach((_, i) => {
      const cell = headerRow.getCell(i + 1)
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + COLORS.headerDark } }
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 }
      cell.alignment = { vertical: 'middle', horizontal: 'center' }
    })

    history.forEach((h, i) => {
      const prev = history[i - 1]
      const trend = prev ? (h.passRate > prev.passRate ? '↑ Amélioration' : h.passRate < prev.passRate ? '↓ Régression' : '→ Stable') : '—'
      const row = ws.addRow({
        runName: h.runName || ('Run ' + h.runId),
        date: h.date ? new Date(h.date).toLocaleDateString('fr-FR') : '—',
        total: h.total,
        passed: h.passed,
        failed: h.failed,
        passRate: h.passRate / 100,
        trend,
      })
      row.height = 20
      if (i % 2 === 0) row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } }
      row.getCell('passRate').numFmt = '0%'
      const rateColor = h.passRate >= 80 ? COLORS.green : COLORS.red
      row.getCell('passRate').font = { bold: true, color: { argb: 'FF' + rateColor } }
      const trendColor = trend.includes('↑') ? COLORS.green : trend.includes('↓') ? COLORS.red : COLORS.midGrey
      row.getCell('trend').font = { color: { argb: 'FF' + trendColor } }
    })

    ws.views = [{ state: 'frozen', ySplit: 1 }]
  }

  // ─── Onglet 5 : Cas échoués détaillés ─────────────────────────────────
  _sheetFailed(wb, failed) {
    const ws = wb.addWorksheet('Cas Échoués', { tabColor: { argb: 'FFEF4444' } })
    ws.columns = [
      { header: '#', key: 'idx', width: 6 },
      { header: 'ID Cas', key: 'testCaseId', width: 12 },
      { header: 'Nom du cas de test', key: 'testCaseName', width: 45 },
      { header: 'Message d\'erreur', key: 'errorMessage', width: 60 },
      { header: 'Testeur', key: 'tester', width: 22 },
      { header: 'Durée (ms)', key: 'durationInMs', width: 14 },
      { header: 'Bugs liés', key: 'bugs', width: 20 },
    ]

    const headerRow = ws.getRow(1)
    headerRow.height = 24
    ws.columns.forEach((_, i) => {
      const cell = headerRow.getCell(i + 1)
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEF4444' } }
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 }
      cell.alignment = { vertical: 'middle', horizontal: 'center' }
    })

    failed.forEach((r, i) => {
      const row = ws.addRow({
        idx: i + 1,
        testCaseId: r.testCaseId,
        testCaseName: r.testCaseName || ('TC-' + r.testCaseId),
        errorMessage: r.errorMessage || '',
        tester: r.tester || '',
        durationInMs: r.durationInMs || 0,
        bugs: (r.associatedBugs || []).map(b => '#' + b.id).join(', ') || '—',
      })
      row.height = 20
      if (i % 2 === 0) row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF5F5' } }
      if (r.errorMessage) row.getCell('errorMessage').font = { color: { argb: 'FFEF4444' }, size: 9 }
    })

    ws.views = [{ state: 'frozen', ySplit: 1 }]
  }
}

module.exports = new ExcelService()
