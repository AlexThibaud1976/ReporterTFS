const PDFDocument = require('pdfkit')
const fs = require('fs')

const C = {
  primary:   '#1e6fff',
  dark:      '#1a1a2e',
  midGrey:   '#6b7280',
  lightGrey: '#f3f4f6',
  border:    '#e5e7eb',
  white:     '#ffffff',
  green:     '#22c55e',
  red:       '#ef4444',
  yellow:    '#f59e0b',
  orange:    '#f97316',
  blue:      '#3b82f6',
  darkGrey:  '#374151',
}

class PdfService {

  async generate(data, outputPath) {
    try {
      const { metadata, planData } = data
      const { plan, metrics, results, suiteMetrics, history, latestRun } = planData

      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        bufferPages: true,
        info: {
          Title: 'Rapport de test — ' + (metadata.applicationName || plan.name),
          Author: metadata.testers || 'TFSReporter',
          Creator: 'TFSReporter v1.0',
        },
      })

      const stream = fs.createWriteStream(outputPath)
      doc.pipe(stream)

      this._coverPage(doc, metadata, metrics, plan)

      doc.addPage({ margins: { top: 40, bottom: 60, left: 40, right: 40 } })
      this._executiveSummary(doc, metadata, metrics, plan, latestRun)

      doc.addPage({ margins: { top: 40, bottom: 60, left: 40, right: 40 } })
      this._suiteResults(doc, suiteMetrics)

      doc.addPage({ margins: { top: 40, bottom: 60, left: 40, right: 40 } })
      this._failedTests(doc, results)

      if (history && history.length > 1) {
        doc.addPage({ margins: { top: 40, bottom: 60, left: 40, right: 40 } })
        this._historySection(doc, history)
      }

      const bugsResult = results.filter(r => r.associatedBugs && r.associatedBugs.length > 0)
      if (bugsResult.length > 0) {
        doc.addPage({ margins: { top: 40, bottom: 60, left: 40, right: 40 } })
        this._bugsSection(doc, bugsResult)
      }

      const pages = doc.bufferedPageRange()
      for (let i = 1; i < pages.count; i++) {
        doc.switchToPage(i)
        this._pageFooter(doc, i, pages.count - 1, metadata)
      }

      doc.end()
      await new Promise((resolve, reject) => {
        stream.on('finish', resolve)
        stream.on('error', reject)
      })

      return { success: true, path: outputPath }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  _coverPage(doc, metadata, metrics, plan) {
    const W = doc.page.width
    const H = doc.page.height

    doc.rect(0, 0, W, H * 0.55).fill(C.dark)
    doc.rect(0, H * 0.55 - 4, W, 4).fill(C.primary)
    doc.rect(0, H * 0.55, W, H * 0.45).fill(C.white)

    // Logo
    doc.roundedRect(50, 50, 52, 52, 8).fill(C.primary)
    doc.fontSize(22).font('Helvetica-Bold').fillColor(C.white).text('TFS', 56, 65)

    // Titre
    doc.fontSize(11).font('Helvetica').fillColor('#89b4fa').text('TFSReporter — Rapport de test', 50, 115)
    doc.fontSize(30).font('Helvetica-Bold').fillColor(C.white)
      .text(metadata.applicationName || plan.name, 50, 155, { width: W - 100 })

    const sub = [
      metadata.applicationVersion ? 'v' + metadata.applicationVersion : null,
      metadata.testEnvironment,
    ].filter(Boolean).join(' · ')
    if (sub) doc.fontSize(13).font('Helvetica').fillColor('#94a3b8').text(sub, 50, 205, { width: W - 100 })

    // Badge statut
    const statusColor = { 'Réussi': C.green, 'Échoué': C.red, 'En cours': C.yellow }[metadata.globalStatus] || C.blue
    doc.roundedRect(50, H * 0.55 - 58, 110, 30, 6).fill(statusColor)
    doc.fontSize(12).font('Helvetica-Bold').fillColor(C.white)
      .text(metadata.globalStatus || 'En cours', 50, H * 0.55 - 50, { width: 110, align: 'center' })

    if (metrics.alertTriggered) {
      doc.roundedRect(178, H * 0.55 - 58, 220, 30, 6).fill(C.red)
      doc.fontSize(10).font('Helvetica-Bold').fillColor(C.white)
        .text('ALERTE : Taux ' + metrics.passRate + '% < 80%', 183, H * 0.55 - 50, { width: 210 })
    }

    // KPIs
    const kpiY = H * 0.55 + 28
    const kpis = [
      { label: 'Total', value: metrics.total, color: C.blue },
      { label: 'Réussis', value: metrics.passed, color: C.green },
      { label: 'Échoués', value: metrics.failed, color: C.red },
      { label: 'Bloqués', value: metrics.blocked, color: C.yellow },
      { label: 'Taux', value: metrics.passRate + '%', color: metrics.passRate >= 80 ? C.green : C.red },
    ]
    const colW = (W - 100) / kpis.length
    kpis.forEach((k, i) => {
      const x = 50 + i * colW
      doc.rect(x, kpiY, colW - 8, 78).fill(C.lightGrey)
      doc.fontSize(26).font('Helvetica-Bold').fillColor(k.color)
        .text(String(k.value), x, kpiY + 10, { width: colW - 8, align: 'center' })
      doc.fontSize(9).font('Helvetica').fillColor(C.midGrey)
        .text(k.label, x, kpiY + 48, { width: colW - 8, align: 'center' })
    })

    // Métadonnées
    const metaY = H * 0.55 + 138
    const metaFields = [
      ['Référence projet', metadata.projectRef],
      ['N° de change', metadata.changeNumber],
      ['Contact IT', metadata.itContact],
      ['Contact métier', metadata.businessContact],
      ['Testeur(s)', metadata.testers],
      ['Approbateur', metadata.approver],
      ['Date début', metadata.startDate ? new Date(metadata.startDate).toLocaleDateString('fr-FR') : null],
      ['Date fin', metadata.endDate ? new Date(metadata.endDate).toLocaleDateString('fr-FR') : null],
    ].filter(function(f){ return f[1] })

    const metaColW = (W - 100) / 2
    metaFields.forEach(function(field, i) {
      const col = i % 2
      const row = Math.floor(i / 2)
      const x = 50 + col * metaColW
      const y = metaY + row * 20
      doc.fontSize(8).font('Helvetica-Bold').fillColor(C.darkGrey).text(field[0] + ' :', x, y, { continued: true })
        .font('Helvetica').fillColor(C.midGrey).text(' ' + field[1], { width: metaColW - 20 })
    })

    doc.fontSize(8).font('Helvetica').fillColor(C.midGrey)
      .text('Généré le ' + new Date().toLocaleString('fr-FR') + ' par TFSReporter', 50, H - 38, { width: W - 100, align: 'center' })
  }

  _executiveSummary(doc, metadata, metrics, plan, latestRun) {
    this._sectionHeader(doc, 'Résumé exécutif')
    const W = doc.page.width - 80
    let y = doc.y + 12

    // Barre taux de réussite
    doc.fontSize(10).font('Helvetica-Bold').fillColor(C.darkGrey).text('Taux de réussite global', 40, y)
    y += 16
    doc.rect(40, y, W, 16).fill(C.border)
    const barW = Math.max(2, Math.round((metrics.passRate / 100) * W))
    doc.rect(40, y, barW, 16).fill(metrics.passRate >= 80 ? C.green : C.red)
    doc.fontSize(9).font('Helvetica-Bold').fillColor(C.white)
      .text(metrics.passRate + '%', 40, y + 3, { width: Math.max(barW, 40), align: 'center' })
    y += 32

    const rows = [
      ['Plan de test', plan.name],
      ['Dernier run', latestRun ? latestRun.name : '—'],
      ["Date d'exécution", latestRun && latestRun.startedDate ? new Date(latestRun.startedDate).toLocaleString('fr-FR') : '—'],
      ['Total tests', String(metrics.total)],
      ['Tests réussis', String(metrics.passed)],
      ['Tests échoués', String(metrics.failed)],
      ['Tests bloqués', String(metrics.blocked)],
      ['Non exécutés', String(metrics.notExecuted)],
      ['Bugs liés', String(metrics.bugsCount)],
      ['Suites de test', String(metrics.suitesCount)],
    ]

    rows.forEach(function(row, i) {
      const rowY = y + i * 22
      doc.rect(40, rowY, W, 22).fill(i % 2 === 0 ? C.lightGrey : C.white).stroke(C.border)
      doc.fontSize(10).font('Helvetica-Bold').fillColor(C.darkGrey).text(row[0], 50, rowY + 6, { width: 200 })
      const vc = row[0].includes('houés') ? C.red : row[0].includes('ussis') ? C.green : C.darkGrey
      doc.fontSize(10).font('Helvetica').fillColor(vc).text(row[1], 260, rowY + 6, { width: W - 220 })
    })

    if (metrics.alertTriggered) {
      y += rows.length * 22 + 15
      doc.rect(40, y, W, 38).fill('#fef2f2').stroke(C.red)
      doc.fontSize(10).font('Helvetica-Bold').fillColor(C.red)
        .text('⚠ ALERTE QUALITÉ : Taux de réussite (' + metrics.passRate + '%) inférieur au seuil de 80%. Action corrective requise.', 50, y + 10, { width: W - 20 })
    }
  }

  _suiteResults(doc, suiteMetrics) {
    this._sectionHeader(doc, 'Résultats par suite de test')
    const W = doc.page.width - 80
    let y = doc.y + 12

    if (!suiteMetrics || suiteMetrics.length === 0) {
      doc.fontSize(10).fillColor(C.midGrey).text('Aucune donnée de suite disponible.', 40, y)
      return
    }

    const cols = [
      { label: 'Suite de test', x: 40, w: 175 },
      { label: 'Total', x: 220, w: 45 },
      { label: 'Réussis', x: 270, w: 55 },
      { label: 'Échoués', x: 330, w: 55 },
      { label: 'Bloqués', x: 390, w: 50 },
      { label: 'Taux réussite', x: 445, w: 90 },
    ]

    doc.rect(40, y, W, 22).fill(C.dark)
    cols.forEach(function(col) {
      doc.fontSize(9).font('Helvetica-Bold').fillColor(C.white).text(col.label, col.x, y + 7, { width: col.w })
    })
    y += 22

    suiteMetrics.forEach(function(sm, i) {
      if (y > doc.page.height - 100) {
        doc.addPage({ margins: { top: 40, bottom: 60, left: 40, right: 40 } })
        y = 40
      }
      doc.rect(40, y, W, 24).fill(i % 2 === 0 ? C.white : C.lightGrey).stroke(C.border)

      const rateColor = sm.passRate >= 80 ? C.green : sm.passRate >= 50 ? C.yellow : C.red
      const barMax = 55
      const barW2 = Math.round((sm.passRate / 100) * barMax)

      doc.fontSize(9).font('Helvetica').fillColor(C.darkGrey)
        .text(sm.suiteName || ('Suite ' + sm.suiteId), 40, y + 7, { width: 175, ellipsis: true })
        .text(String(sm.total), 220, y + 7, { width: 45, align: 'center' })
      doc.fillColor(C.green).text(String(sm.passed), 270, y + 7, { width: 55, align: 'center' })
      doc.fillColor(sm.failed > 0 ? C.red : C.midGrey).text(String(sm.failed), 330, y + 7, { width: 55, align: 'center' })
      doc.fillColor(sm.blocked > 0 ? C.yellow : C.midGrey).text(String(sm.blocked), 390, y + 7, { width: 50, align: 'center' })

      doc.rect(445, y + 6, barMax, 12).fill(C.border)
      if (barW2 > 0) doc.rect(445, y + 6, barW2, 12).fill(rateColor)
      doc.fillColor(C.darkGrey).text(sm.passRate + '%', 505, y + 7, { width: 30 })
      y += 24
    })
  }

  _failedTests(doc, results) {
    this._sectionHeader(doc, 'Détail des cas échoués')
    const W = doc.page.width - 80
    let y = doc.y + 12

    const failed = results.filter(function(r) { return r.outcome === 'Failed' })
    if (failed.length === 0) {
      doc.rect(40, y, W, 38).fill('#f0fdf4').stroke(C.green)
      doc.fontSize(11).font('Helvetica-Bold').fillColor(C.green)
        .text('✓ Aucun cas de test échoué — Félicitations !', 50, y + 12, { width: W - 20 })
      return
    }

    doc.fontSize(10).font('Helvetica').fillColor(C.midGrey).text(failed.length + ' cas échoué(s)', 40, y)
    y += 18

    failed.forEach(function(r, i) {
      if (y > doc.page.height - 120) {
        doc.addPage({ margins: { top: 40, bottom: 60, left: 40, right: 40 } })
        y = 40
      }
      const hasMsg = r.errorMessage && r.errorMessage.length > 0
      const blockH = hasMsg ? 68 : 42
      doc.rect(40, y, W, blockH).fill('#fff5f5').stroke(C.red)
      doc.rect(40, y, 4, blockH).fill(C.red)

      doc.fontSize(10).font('Helvetica-Bold').fillColor(C.darkGrey)
        .text((i + 1) + '. ' + (r.testCaseName || ('TC-' + r.testCaseId)), 52, y + 8, { width: W - 110 })

      if (r.durationInMs) {
        const dur = r.durationInMs > 1000 ? (r.durationInMs / 1000).toFixed(1) + 's' : r.durationInMs + 'ms'
        doc.fontSize(8).font('Helvetica').fillColor(C.midGrey).text(dur, W - 55, y + 10, { width: 60, align: 'right' })
      }

      if (hasMsg) {
        const msg = r.errorMessage.length > 250 ? r.errorMessage.slice(0, 250) + '...' : r.errorMessage
        doc.fontSize(8).font('Helvetica').fillColor(C.red).text(msg, 52, y + 26, { width: W - 25 })
      }

      if (r.tester) {
        doc.fontSize(8).font('Helvetica').fillColor(C.midGrey)
          .text('Testeur : ' + r.tester, 52, y + blockH - 14, { width: 200 })
      }

      y += blockH + 8
    })
  }

  _historySection(doc, history) {
    this._sectionHeader(doc, 'Historique des exécutions')
    const W = doc.page.width - 80
    let y = doc.y + 12

    const cols = [
      { label: 'Run', x: 40, w: 185 },
      { label: 'Date', x: 230, w: 100 },
      { label: 'Total', x: 335, w: 50 },
      { label: 'Réussis', x: 390, w: 55 },
      { label: 'Taux', x: 450, w: 50 },
      { label: '+/-', x: 505, w: 40 },
    ]

    doc.rect(40, y, W, 22).fill(C.dark)
    cols.forEach(function(col) {
      doc.fontSize(9).font('Helvetica-Bold').fillColor(C.white).text(col.label, col.x, y + 7, { width: col.w })
    })
    y += 22

    history.forEach(function(h, i) {
      if (y > doc.page.height - 80) {
        doc.addPage({ margins: { top: 40, bottom: 60, left: 40, right: 40 } })
        y = 40
      }
      doc.rect(40, y, W, 22).fill(i % 2 === 0 ? C.white : C.lightGrey).stroke(C.border)
      const prev = history[i - 1]
      const trend = prev ? (h.passRate > prev.passRate ? '↑' : h.passRate < prev.passRate ? '↓' : '→') : '—'
      const trendColor = trend === '↑' ? C.green : trend === '↓' ? C.red : C.midGrey
      const rateColor = h.passRate >= 80 ? C.green : h.passRate >= 50 ? C.yellow : C.red
      const dateStr = h.date ? new Date(h.date).toLocaleDateString('fr-FR') : '—'

      doc.fontSize(9).font('Helvetica').fillColor(C.darkGrey)
        .text(h.runName || ('Run ' + h.runId), 40, y + 6, { width: 185, ellipsis: true })
      doc.fillColor(C.midGrey).text(dateStr, 230, y + 6, { width: 100 })
      doc.fillColor(C.darkGrey).text(String(h.total), 335, y + 6, { width: 50, align: 'center' })
      doc.fillColor(C.green).text(String(h.passed), 390, y + 6, { width: 55, align: 'center' })
      doc.fillColor(rateColor).text(h.passRate + '%', 450, y + 6, { width: 50, align: 'center' })
      doc.fontSize(12).font('Helvetica-Bold').fillColor(trendColor).text(trend, 505, y + 4, { width: 40, align: 'center' })
      y += 22
    })
  }

  _bugsSection(doc, resultsWithBugs) {
    this._sectionHeader(doc, 'Bugs liés aux cas échoués')
    const W = doc.page.width - 80
    let y = doc.y + 12

    const bugMap = new Map()
    resultsWithBugs.forEach(function(r) {
      if (r.associatedBugs) {
        r.associatedBugs.forEach(function(b) {
          if (!bugMap.has(b.id)) bugMap.set(b.id, { ...b, testCase: r.testCaseName || ('TC-' + r.testCaseId) })
        })
      }
    })

    doc.fontSize(10).font('Helvetica').fillColor(C.midGrey).text(bugMap.size + ' bug(s) lié(s)', 40, y)
    y += 18

    bugMap.forEach(function(bug, id) {
      if (y > doc.page.height - 80) {
        doc.addPage({ margins: { top: 40, bottom: 60, left: 40, right: 40 } })
        y = 40
      }
      doc.rect(40, y, W, 36).fill(C.lightGrey).stroke(C.border)
      doc.rect(40, y, 4, 36).fill(C.orange)
      doc.fontSize(10).font('Helvetica-Bold').fillColor(C.darkGrey).text('Bug #' + id, 52, y + 6, { width: 100 })
      doc.fontSize(9).font('Helvetica').fillColor(C.midGrey).text('Cas lié : ' + bug.testCase, 52, y + 22, { width: W - 25 })
      y += 44
    })
  }

  _sectionHeader(doc, title) {
    const W = doc.page.width - 80
    doc.rect(40, doc.y, W, 34).fill(C.dark)
    doc.rect(40, doc.y, 4, 34).fill(C.primary)
    doc.fontSize(13).font('Helvetica-Bold').fillColor(C.white).text(title, 53, doc.y + 10, { width: W - 20 })
    doc.moveDown(0.4)
  }

  _pageFooter(doc, pageNum, total, metadata) {
    const W = doc.page.width
    const H = doc.page.height
    doc.rect(0, H - 38, W, 38).fill(C.dark)
    doc.fontSize(8).font('Helvetica').fillColor('#94a3b8')
      .text(metadata.applicationName || 'TFSReporter', 40, H - 24, { width: 200 })
      .text('Page ' + pageNum + ' / ' + total, 40, H - 24, { width: W - 80, align: 'right' })
  }
}

module.exports = new PdfService()
