const PDFDocument = require('pdfkit')
const fs = require('fs')

// â”€â”€â”€ Palette â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const C = {
  // Fond et surfaces
  navy:       '#0F172A',
  navyMid:    '#1E293B',
  surface:    '#F8FAFC',
  surfaceAlt: '#F1F5F9',
  white:      '#FFFFFF',
  border:     '#E2E8F0',

  // Texte
  textDark:   '#0F172A',
  textMid:    '#334155',
  textMuted:  '#64748B',
  textLight:  '#94A3B8',

  // Accent principal
  accent:     '#2563EB',
  accentSoft: '#DBEAFE',

  // SÃ©mantique
  green:      '#16A34A',
  greenSoft:  '#DCFCE7',
  red:        '#DC2626',
  redSoft:    '#FEE2E2',
  yellow:     '#D97706',
  yellowSoft: '#FEF3C7',
  orange:     '#EA580C',
  orangeSoft: '#FFEDD5',
}

const PAGE_W = 595.28
const PAGE_H = 841.89
const MARGIN = 44

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
          Title: 'Rapport de test â€” ' + (metadata.applicationName || plan.name),
          Author: metadata.testers || 'TFSReporter',
          Creator: 'TFSReporter v1.0',
        },
      })

      const stream = fs.createWriteStream(outputPath)
      doc.pipe(stream)

      this._coverPage(doc, metadata, metrics, plan)

      doc.addPage({ margins: { top: MARGIN, bottom: 56, left: MARGIN, right: MARGIN } })
      this._executiveSummary(doc, metadata, metrics, plan, latestRun)

      doc.addPage({ margins: { top: MARGIN, bottom: 56, left: MARGIN, right: MARGIN } })
      this._suiteResults(doc, suiteMetrics)

      doc.addPage({ margins: { top: MARGIN, bottom: 56, left: MARGIN, right: MARGIN } })
      this._failedTests(doc, results)

      if (history && history.length > 1) {
        doc.addPage({ margins: { top: MARGIN, bottom: 56, left: MARGIN, right: MARGIN } })
        this._historySection(doc, history)
      }

      const bugsResult = results.filter(r => r.associatedBugs && r.associatedBugs.length > 0)
      if (bugsResult.length > 0) {
        doc.addPage({ margins: { top: MARGIN, bottom: 56, left: MARGIN, right: MARGIN } })
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

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // PAGE DE COUVERTURE
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  _coverPage(doc, metadata, metrics, plan) {
    const W = PAGE_W
    const H = PAGE_H
    const split = H * 0.62

    // Fond supÃ©rieur navy
    doc.rect(0, 0, W, split).fill(C.navy)
    // Bande accent
    doc.rect(0, split - 6, W, 6).fill(C.accent)
    // Fond infÃ©rieur blanc
    doc.rect(0, split, W, H - split).fill(C.white)

    // Motif dÃ©coratif cercles discrets en haut Ã  droite
    doc.circle(W - 60, 80, 110).fill('#1E293B')
    doc.circle(W - 30, 30, 55).fill('#1E3A5F')

    // Logo
    doc.roundedRect(MARGIN, 44, 46, 46, 10).fill(C.accent)
    doc.fontSize(18).font('Helvetica-Bold').fillColor(C.white)
      .text('TFS', MARGIN + 7, 58, { width: 32, align: 'center' })

    // Sur-titre
    doc.fontSize(9).font('Helvetica').fillColor(C.textLight)
      .text('TFSReporter  Â·  Rapport de test automatisÃ©', MARGIN, 106, { characterSpacing: 0.5 })

    // Titre principal
    const appName = metadata.applicationName || plan.name || 'Rapport'
    doc.fontSize(34).font('Helvetica-Bold').fillColor(C.white)
      .text(appName, MARGIN, 126, { width: W - 100, lineGap: 4 })

    // Sous-titre
    const sub = [
      metadata.applicationVersion ? 'Version ' + metadata.applicationVersion : null,
      metadata.testEnvironment || null,
    ].filter(Boolean).join('   Â·   ')
    if (sub) {
      doc.fontSize(12).font('Helvetica').fillColor(C.textLight)
        .text(sub, MARGIN, doc.y + 6, { width: W - 100 })
    }

    // Badge statut
    const badgeY = split - 54
    const statusColors = { 'RÃ©ussi': C.green, 'Ã‰chouÃ©': C.red, 'En cours': C.yellow }
    const statusBg = statusColors[metadata.globalStatus] || C.accent
    doc.roundedRect(MARGIN, badgeY, 108, 26, 5).fill(statusBg)
    doc.fontSize(10).font('Helvetica-Bold').fillColor(C.white)
      .text(metadata.globalStatus || 'En cours', MARGIN, badgeY + 7, { width: 108, align: 'center' })

    if (metrics.alertTriggered) {
      doc.roundedRect(MARGIN + 120, badgeY, 200, 26, 5).fill(C.red)
      doc.fontSize(9).font('Helvetica-Bold').fillColor(C.white)
        .text('âš   Taux ' + metrics.passRate + '% â€” Seuil non atteint', MARGIN + 120, badgeY + 8, { width: 196, align: 'center' })
    }

    // Tuiles KPI
    const kpiTop = split + 22
    const kpis = [
      { label: 'Tests',   value: metrics.total,          color: C.accent,  bg: C.accentSoft },
      { label: 'RÃ©ussis', value: metrics.passed,         color: C.green,   bg: C.greenSoft },
      { label: 'Ã‰chouÃ©s', value: metrics.failed,         color: C.red,     bg: C.redSoft },
      { label: 'BloquÃ©s', value: metrics.blocked,        color: C.yellow,  bg: C.yellowSoft },
      { label: 'Taux',    value: metrics.passRate + '%', color: metrics.passRate >= 80 ? C.green : C.red,
        bg: metrics.passRate >= 80 ? C.greenSoft : C.redSoft },
    ]
    const tileW = (W - MARGIN * 2 - 8 * 4) / 5
    kpis.forEach((k, i) => {
      const x = MARGIN + i * (tileW + 8)
      doc.roundedRect(x, kpiTop, tileW, 82, 8).fill(C.surfaceAlt)
      // Accent top bar
      doc.roundedRect(x, kpiTop, tileW, 4, 2).fill(k.color)
      // Valeur
      doc.fontSize(28).font('Helvetica-Bold').fillColor(k.color)
        .text(String(k.value), x, kpiTop + 18, { width: tileW, align: 'center' })
      // Label
      doc.fontSize(8).font('Helvetica').fillColor(C.textMuted)
        .text(k.label.toUpperCase(), x, kpiTop + 56, { width: tileW, align: 'center', characterSpacing: 0.4 })
    })

    // Barre de rÃ©ussite visuelle
    const barTop = kpiTop + 102
    const barW = W - MARGIN * 2
    const barColor = metrics.passRate >= 80 ? C.green : C.red
    doc.roundedRect(MARGIN, barTop, barW, 10, 5).fill(C.border)
    const fill = Math.max(10, Math.round((metrics.passRate / 100) * barW))
    doc.roundedRect(MARGIN, barTop, fill, 10, 5).fill(barColor)
    doc.fontSize(8).font('Helvetica-Bold').fillColor(C.textMuted)
      .text('Taux de rÃ©ussite : ' + metrics.passRate + '%', MARGIN, barTop + 14, { width: barW, align: 'right' })

    // Grille mÃ©tadonnÃ©es
    const metaFields = [
      ['RÃ©fÃ©rence projet', metadata.projectRef],
      ['NÂ° de change',     metadata.changeNumber],
      ['Contact IT',       metadata.itContact],
      ['Contact mÃ©tier',   metadata.businessContact],
      ['Testeur(s)',       metadata.testers],
      ['Approbateur',      metadata.approver],
      ['DÃ©but', metadata.startDate ? new Date(metadata.startDate).toLocaleDateString('fr-FR') : null],
      ['Fin',   metadata.endDate   ? new Date(metadata.endDate).toLocaleDateString('fr-FR')   : null],
    ].filter(f => f[1])

    if (metaFields.length > 0) {
      const metaTop = barTop + 38
      const colW = barW / 2
      metaFields.forEach((field, i) => {
        const col = i % 2
        const row = Math.floor(i / 2)
        const x = MARGIN + col * (colW + 8)
        const y = metaTop + row * 20
        if (row % 2 === 0) doc.rect(x, y - 2, colW - 4, 18).fill(C.surfaceAlt)
        doc.fontSize(8).font('Helvetica-Bold').fillColor(C.textMid).text(field[0], x + 4, y + 2, { width: 90 })
        doc.fontSize(8).font('Helvetica').fillColor(C.textMuted).text(field[1], x + 98, y + 2, { width: colW - 110 })
      })
    }

    // Date de gÃ©nÃ©ration
    doc.fontSize(7.5).font('Helvetica').fillColor(C.textLight)
      .text('GÃ©nÃ©rÃ© le ' + new Date().toLocaleString('fr-FR') + ' par TFSReporter', MARGIN, H - 32, { width: W - MARGIN * 2, align: 'center' })
  }

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // RÃ‰SUMÃ‰ EXÃ‰CUTIF
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  _executiveSummary(doc, metadata, metrics, plan, latestRun) {
    this._sectionHeader(doc, 'RÃ©sumÃ© exÃ©cutif', '01')
    const W = PAGE_W - MARGIN * 2
    let y = doc.y + 16

    // Barre de rÃ©ussite
    doc.fontSize(9).font('Helvetica-Bold').fillColor(C.textMid)
      .text('TAUX DE RÃ‰USSITE GLOBAL', MARGIN, y, { characterSpacing: 0.6 })
    y += 14
    const barColor = metrics.passRate >= 80 ? C.green : C.red
    const barFill = Math.max(6, Math.round((metrics.passRate / 100) * W))
    doc.roundedRect(MARGIN, y, W, 18, 4).fill(C.border)
    doc.roundedRect(MARGIN, y, barFill, 18, 4).fill(barColor)
    doc.fontSize(9).font('Helvetica-Bold').fillColor(C.white).text(metrics.passRate + '%', MARGIN + 8, y + 4)
    y += 32

    // Tableau rÃ©capitulatif
    const rows = [
      ['Plan de test',    plan.name],
      ['Dernier run',     latestRun ? latestRun.name : 'â€”'],
      ["Date d'exÃ©cution", latestRun && latestRun.startedDate ? new Date(latestRun.startedDate).toLocaleString('fr-FR') : 'â€”'],
      ['Total tests',     String(metrics.total)],
      ['Tests rÃ©ussis',   String(metrics.passed)],
      ['Tests Ã©chouÃ©s',   String(metrics.failed)],
      ['Tests bloquÃ©s',   String(metrics.blocked)],
      ['Non exÃ©cutÃ©s',    String(metrics.notExecuted)],
      ['Bugs liÃ©s',       String(metrics.bugsCount)],
      ['Suites de test',  String(metrics.suitesCount)],
    ]

    const ROW_H = 24
    rows.forEach((row, i) => {
      const rowY = y + i * ROW_H
      doc.rect(MARGIN, rowY, W, ROW_H).fill(i % 2 === 0 ? C.surfaceAlt : C.white)
      const isHighlight = ['Tests rÃ©ussis', 'Tests Ã©chouÃ©s'].includes(row[0])
      if (isHighlight) {
        const hc = row[0] === 'Tests rÃ©ussis' ? C.green : C.red
        doc.rect(MARGIN, rowY, 3, ROW_H).fill(hc)
      }
      doc.fontSize(9.5).font('Helvetica-Bold').fillColor(C.textMid).text(row[0], MARGIN + 10, rowY + 7, { width: 195 })
      let vc = C.textDark
      if (row[0] === 'Tests rÃ©ussis') vc = C.green
      else if (row[0] === 'Tests Ã©chouÃ©s') vc = metrics.failed > 0 ? C.red : C.textDark
      else if (row[0] === 'Tests bloquÃ©s') vc = metrics.blocked > 0 ? C.yellow : C.textDark
      doc.fontSize(9.5).font('Helvetica').fillColor(vc).text(row[1], MARGIN + 215, rowY + 7, { width: W - 220 })
      doc.rect(MARGIN, rowY + ROW_H - 1, W, 1).fill(C.border)
    })

    // Alerte qualitÃ©
    if (metrics.alertTriggered) {
      const alertY = y + rows.length * ROW_H + 16
      doc.roundedRect(MARGIN, alertY, W, 42, 6).fill(C.redSoft)
      doc.rect(MARGIN, alertY, 4, 42).fill(C.red)
      doc.fontSize(10).font('Helvetica-Bold').fillColor(C.red).text('Alerte qualitÃ©', MARGIN + 14, alertY + 8)
      doc.fontSize(9).font('Helvetica').fillColor(C.red)
        .text('Le taux de rÃ©ussite (' + metrics.passRate + '%) est infÃ©rieur au seuil cible de 80 %. Une action corrective est requise.', MARGIN + 14, alertY + 23, { width: W - 24 })
    }
  }

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // RÃ‰SULTATS PAR SUITE
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  _suiteResults(doc, suiteMetrics) {
    this._sectionHeader(doc, 'RÃ©sultats par suite de test', '02')
    const W = PAGE_W - MARGIN * 2
    let y = doc.y + 16

    if (!suiteMetrics || suiteMetrics.length === 0) {
      doc.fontSize(9).fillColor(C.textMuted).text('Aucune donnÃ©e de suite disponible.', MARGIN, y)
      return
    }

    const cols = [
      { label: 'Suite de test', x: MARGIN,        w: 178 },
      { label: 'Total',         x: MARGIN + 183,   w: 44 },
      { label: 'RÃ©ussis',       x: MARGIN + 232,   w: 52 },
      { label: 'Ã‰chouÃ©s',       x: MARGIN + 289,   w: 52 },
      { label: 'BloquÃ©s',       x: MARGIN + 346,   w: 50 },
      { label: 'Taux',          x: MARGIN + 401,   w: 106 },
    ]

    const HDR_H = 26
    doc.rect(MARGIN, y, W, HDR_H).fill(C.navyMid)
    cols.forEach(col => {
      doc.fontSize(8.5).font('Helvetica-Bold').fillColor(C.white)
        .text(col.label.toUpperCase(), col.x + 4, y + 8, { width: col.w, characterSpacing: 0.3 })
    })
    y += HDR_H

    const ROW_H = 26
    suiteMetrics.forEach((sm, i) => {
      if (y > PAGE_H - 100) {
        doc.addPage({ margins: { top: MARGIN, bottom: 56, left: MARGIN, right: MARGIN } })
        y = MARGIN
      }
      doc.rect(MARGIN, y, W, ROW_H).fill(i % 2 === 0 ? C.white : C.surfaceAlt)
      doc.rect(MARGIN, y + ROW_H - 1, W, 1).fill(C.border)

      const rateColor = sm.passRate >= 80 ? C.green : sm.passRate >= 50 ? C.yellow : C.red
      const PROG_W = 70
      const fillW = Math.max(4, Math.round((sm.passRate / 100) * PROG_W))

      doc.fontSize(9).font('Helvetica').fillColor(C.textDark)
        .text(sm.suiteName || ('Suite ' + sm.suiteId), MARGIN + 4, y + 8, { width: 174, ellipsis: true })
      doc.fillColor(C.textMid)
        .text(String(sm.total),   MARGIN + 187, y + 8, { width: 40, align: 'center' })
      doc.fillColor(C.green)
        .text(String(sm.passed),  MARGIN + 236, y + 8, { width: 48, align: 'center' })
      doc.fillColor(sm.failed  > 0 ? C.red    : C.textMuted)
        .text(String(sm.failed),  MARGIN + 293, y + 8, { width: 48, align: 'center' })
      doc.fillColor(sm.blocked > 0 ? C.yellow : C.textMuted)
        .text(String(sm.blocked), MARGIN + 350, y + 8, { width: 46, align: 'center' })

      const bx = MARGIN + 405
      const by = y + 8
      doc.roundedRect(bx, by, PROG_W, 10, 3).fill(C.border)
      doc.roundedRect(bx, by, fillW, 10, 3).fill(rateColor)
      doc.fontSize(8.5).font('Helvetica-Bold').fillColor(C.textMid)
        .text(sm.passRate + '%', bx + PROG_W + 6, by, { width: 30 })

      y += ROW_H
    })
  }

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // TESTS Ã‰CHOUÃ‰S
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  _failedTests(doc, results) {
    this._sectionHeader(doc, 'DÃ©tail des cas Ã©chouÃ©s', '03')
    const W = PAGE_W - MARGIN * 2
    let y = doc.y + 16

    const failed = results.filter(r => r.outcome === 'Failed')
    if (failed.length === 0) {
      doc.roundedRect(MARGIN, y, W, 48, 8).fill(C.greenSoft)
      doc.rect(MARGIN, y, 4, 48).fill(C.green)
      doc.fontSize(12).font('Helvetica-Bold').fillColor(C.green)
        .text('Aucun cas de test Ã©chouÃ©', MARGIN + 16, y + 10)
      doc.fontSize(9).font('Helvetica').fillColor(C.green)
        .text('Tous les tests exÃ©cutÃ©s ont Ã©tÃ© rÃ©ussis â€” excellent rÃ©sultat !', MARGIN + 16, y + 27, { width: W - 24 })
      return
    }

    doc.fontSize(8.5).font('Helvetica').fillColor(C.textMuted)
      .text(failed.length + ' cas Ã©chouÃ©' + (failed.length > 1 ? 's' : ''), MARGIN, y)
    y += 16

    failed.forEach((r, i) => {
      const hasMsg = r.errorMessage && r.errorMessage.trim().length > 0
      const cardH = hasMsg ? 74 : 44
      if (y + cardH > PAGE_H - 80) {
        doc.addPage({ margins: { top: MARGIN, bottom: 56, left: MARGIN, right: MARGIN } })
        y = MARGIN
      }
      // Ombre
      doc.roundedRect(MARGIN + 1, y + 1, W, cardH, 6).fill('#DDE3EA')
      // Carte
      doc.roundedRect(MARGIN, y, W, cardH, 6).fill(C.white)
      // Bande rouge gauche
      doc.roundedRect(MARGIN, y, 4, cardH, 6).fill(C.red)

      // NumÃ©ro
      const numW = 22
      doc.roundedRect(MARGIN + 12, y + 10, numW, numW, 4).fill(C.redSoft)
      doc.fontSize(9).font('Helvetica-Bold').fillColor(C.red)
        .text(String(i + 1), MARGIN + 12, y + 16, { width: numW, align: 'center' })

      doc.fontSize(10).font('Helvetica-Bold').fillColor(C.textDark)
        .text(r.testCaseName || ('TC-' + r.testCaseId), MARGIN + 42, y + 13, { width: W - 110, ellipsis: true })

      if (r.durationInMs) {
        const dur = r.durationInMs > 1000 ? (r.durationInMs / 1000).toFixed(1) + 's' : r.durationInMs + 'ms'
        doc.fontSize(8).font('Helvetica').fillColor(C.textMuted)
          .text(dur, MARGIN, y + 14, { width: W - 10, align: 'right' })
      }

      if (r.tester) {
        doc.fontSize(8).font('Helvetica').fillColor(C.textMuted)
          .text('Testeur : ' + r.tester, MARGIN + 42, y + 27, { width: W - 60 })
      }

      if (hasMsg) {
        const maxMsg = 310
        const msg = r.errorMessage.length > maxMsg ? r.errorMessage.slice(0, maxMsg) + 'â€¦' : r.errorMessage
        doc.roundedRect(MARGIN + 10, y + cardH - 30, W - 20, 22, 4).fill(C.redSoft)
        doc.fontSize(7.5).font('Helvetica').fillColor(C.red)
          .text(msg, MARGIN + 16, y + cardH - 24, { width: W - 36 })
      }

      y += cardH + 10
    })
  }

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // HISTORIQUE
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  _historySection(doc, history) {
    this._sectionHeader(doc, 'Historique des exÃ©cutions', '04')
    const W = PAGE_W - MARGIN * 2
    let y = doc.y + 16

    const cols = [
      { label: 'Run',      x: MARGIN,       w: 180 },
      { label: 'Date',     x: MARGIN + 185,  w: 96 },
      { label: 'Total',    x: MARGIN + 286,  w: 46 },
      { label: 'RÃ©ussis',  x: MARGIN + 337,  w: 52 },
      { label: 'Taux',     x: MARGIN + 394,  w: 60 },
      { label: 'Tendance', x: MARGIN + 459,  w: 48 },
    ]

    const HDR_H = 26
    doc.rect(MARGIN, y, W, HDR_H).fill(C.navyMid)
    cols.forEach(col => {
      doc.fontSize(8.5).font('Helvetica-Bold').fillColor(C.white)
        .text(col.label.toUpperCase(), col.x + 4, y + 8, { width: col.w, characterSpacing: 0.3 })
    })
    y += HDR_H

    const ROW_H = 24
    history.forEach((h, i) => {
      if (y > PAGE_H - 80) {
        doc.addPage({ margins: { top: MARGIN, bottom: 56, left: MARGIN, right: MARGIN } })
        y = MARGIN
      }
      doc.rect(MARGIN, y, W, ROW_H).fill(i % 2 === 0 ? C.white : C.surfaceAlt)
      doc.rect(MARGIN, y + ROW_H - 1, W, 1).fill(C.border)

      const prev = history[i - 1]
      const trend = prev ? (h.passRate > prev.passRate ? 'â–²' : h.passRate < prev.passRate ? 'â–¼' : 'â†’') : 'â€”'
      const trendColor = trend === 'â–²' ? C.green : trend === 'â–¼' ? C.red : C.textMuted
      const rateColor = h.passRate >= 80 ? C.green : h.passRate >= 50 ? C.yellow : C.red
      const dateStr = h.date ? new Date(h.date).toLocaleDateString('fr-FR') : 'â€”'

      doc.fontSize(9).font('Helvetica').fillColor(C.textDark)
        .text(h.runName || ('Run ' + h.runId), MARGIN + 4, y + 7, { width: 176, ellipsis: true })
      doc.fillColor(C.textMuted).text(dateStr, MARGIN + 189, y + 7, { width: 92 })
      doc.fillColor(C.textMid).text(String(h.total), MARGIN + 290, y + 7, { width: 42, align: 'center' })
      doc.fillColor(C.green).text(String(h.passed), MARGIN + 341, y + 7, { width: 48, align: 'center' })
      doc.fillColor(rateColor).font('Helvetica-Bold').text(h.passRate + '%', MARGIN + 398, y + 7, { width: 56, align: 'center' })
      doc.fillColor(trendColor).font('Helvetica-Bold').text(trend, MARGIN + 463, y + 7, { width: 44, align: 'center' })
      y += ROW_H
    })
  }

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // BUGS LIÃ‰S
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  _bugsSection(doc, resultsWithBugs) {
    this._sectionHeader(doc, 'Bugs liÃ©s aux cas Ã©chouÃ©s', '05')
    const W = PAGE_W - MARGIN * 2
    let y = doc.y + 16

    const bugMap = new Map()
    resultsWithBugs.forEach(r => {
      if (r.associatedBugs) {
        r.associatedBugs.forEach(b => {
          if (!bugMap.has(b.id)) bugMap.set(b.id, { ...b, testCase: r.testCaseName || ('TC-' + r.testCaseId) })
        })
      }
    })

    doc.fontSize(8.5).font('Helvetica').fillColor(C.textMuted)
      .text(bugMap.size + ' bug(s) associÃ©(s)', MARGIN, y)
    y += 16

    bugMap.forEach((bug, id) => {
      if (y > PAGE_H - 80) {
        doc.addPage({ margins: { top: MARGIN, bottom: 56, left: MARGIN, right: MARGIN } })
        y = MARGIN
      }
      doc.roundedRect(MARGIN + 1, y + 1, W, 40, 6).fill('#DDE3EA')
      doc.roundedRect(MARGIN, y, W, 40, 6).fill(C.orangeSoft)
      doc.roundedRect(MARGIN, y, 4, 40, 6).fill(C.orange)
      doc.fontSize(9.5).font('Helvetica-Bold').fillColor(C.orange).text('Bug #' + id, MARGIN + 14, y + 7)
      doc.fontSize(8.5).font('Helvetica').fillColor(C.textMid)
        .text('Cas liÃ© : ' + bug.testCase, MARGIN + 14, y + 24, { width: W - 28 })
      y += 50
    })
  }

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // UTILITAIRES
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  _sectionHeader(doc, title, num = '') {
    const W = PAGE_W - MARGIN * 2
    const y = doc.y
    doc.rect(MARGIN, y, W, 38).fill(C.surfaceAlt)
    doc.rect(MARGIN, y, 4, 38).fill(C.accent)
    if (num) {
      doc.fontSize(8).font('Helvetica-Bold').fillColor(C.accent).text(num, MARGIN + 12, y + 6, { width: 20 })
    }
    doc.fontSize(14).font('Helvetica-Bold').fillColor(C.textDark)
      .text(title, MARGIN + (num ? 30 : 14), y + 11, { width: W - 40 })
    doc.rect(MARGIN, y + 38, W, 1).fill(C.border)
    doc.moveDown(0.1)
  }

  _pageFooter(doc, pageNum, total, metadata) {
    const W = PAGE_W
    const H = PAGE_H
    doc.rect(MARGIN, H - 44, W - MARGIN * 2, 1).fill(C.border)
    doc.fontSize(8).font('Helvetica').fillColor(C.textLight)
      .text(metadata.applicationName || 'TFSReporter', MARGIN, H - 34, { width: 250 })
    doc.fontSize(8).font('Helvetica').fillColor(C.textMuted)
      .text('Page ' + pageNum + ' / ' + total, MARGIN, H - 34, { width: W - MARGIN * 2, align: 'right' })
  }
}

module.exports = new PdfService()

