const PptxGenJS = require('pptxgenjs')

/**
 * PptxService — Génère une présentation PowerPoint professionnelle
 * Slides : Titre → KPIs → Taux de réussite → Résultats par statut → Suites → Conclusion
 */
class PptxService {

  static COLORS = {
    base:    '1e1e2e',
    mantle:  '181825',
    text:    'cdd6f4',
    subtext: 'a6adc8',
    overlay: '6c7086',
    blue:    '89b4fa',
    green:   'a6e3a1',
    red:     'f38ba8',
    yellow:  'f9e2af',
    peach:   'fab387',
    mauve:   'cba6f7',
    surface: '313244',
    white:   'FFFFFF',
  }

  static STATUS_COLORS = {
    Passed:       '00b894',
    Failed:       'e17055',
    Blocked:      'fdcb6e',
    NotExecuted:  '636e72',
    Inconclusive: 'fab387',
    NotApplicable:'636e72',
  }

  async generate(data, outputPath) {
    try {
      const { metadata, planData } = data
      if (!planData) throw new Error('Données du plan de test manquantes')

      const pptx = new PptxGenJS()
      const C = PptxService.COLORS

      // Configuration globale
      pptx.layout = 'LAYOUT_WIDE'
      pptx.title = `Rapport de Test — ${metadata.applicationName || 'Application'}`
      pptx.subject = planData.plan?.name || ''
      pptx.author = metadata.testers || 'TFSReporter'

      // Thème de base
      pptx.defineLayout({ name: 'LAYOUT_WIDE', width: 13.33, height: 7.5 })

      // Générer les slides
      this._slideCover(pptx, metadata, planData)
      this._slideKpis(pptx, metadata, planData)
      this._slidePassRate(pptx, planData)
      this._slideResultsByStatus(pptx, planData)
      this._slideSuites(pptx, planData)
      if (planData.metrics?.bugsCount > 0) {
        this._slideBugs(pptx, planData)
      }
      this._slideConclusion(pptx, metadata, planData)

      await pptx.writeFile({ fileName: outputPath })
      return { success: true, path: outputPath }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  // ─── SLIDE 1 : Couverture ─────────────────────────────────────────────
  _slideCover(pptx, metadata, planData) {
    const C = PptxService.COLORS
    const slide = pptx.addSlide()

    // Fond sombre
    slide.background = { color: C.base }

    // Bande décorative bleue
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 6.5, w: 13.33, h: 0.08, fill: { color: C.blue },
    })

    // Titre
    slide.addText('RAPPORT DE TEST', {
      x: 1, y: 1.5, w: 11.33, h: 1.2,
      fontSize: 40, bold: true, color: C.white,
      align: 'center', fontFace: 'Calibri',
    })

    // Sous-titre application
    slide.addText(metadata.applicationName || 'Application', {
      x: 1, y: 2.8, w: 11.33, h: 0.6,
      fontSize: 22, color: C.blue, align: 'center', fontFace: 'Calibri',
    })

    // Plan de test
    slide.addText(planData.plan?.name || '—', {
      x: 1, y: 3.5, w: 11.33, h: 0.5,
      fontSize: 14, color: C.subtext, align: 'center', italic: true,
    })

    // Ligne séparatrice
    slide.addShape(pptx.ShapeType.line, {
      x: 3, y: 4.3, w: 7.33, h: 0,
      line: { color: C.surface, width: 1 },
    })

    // Informations clés (grille 3x2)
    const infos = [
      { label: 'Environnement', value: metadata.testEnvironment },
      { label: 'Testeur(s)', value: metadata.testers },
      { label: 'Statut', value: metadata.globalStatus },
      { label: 'Référence', value: metadata.projectRef },
      { label: 'Contact IT', value: metadata.itContact },
      { label: 'Date', value: metadata.endDate ? new Date(metadata.endDate).toLocaleDateString('fr-FR') : '—' },
    ]

    infos.forEach((info, i) => {
      const col = i % 3
      const row = Math.floor(i / 3)
      const x = 1 + col * 4.1
      const y = 4.6 + row * 0.85

      slide.addText(info.label.toUpperCase(), {
        x, y, w: 3.8, h: 0.25,
        fontSize: 7, color: C.overlay, bold: true,
      })
      slide.addText(info.value || '—', {
        x, y: y + 0.25, w: 3.8, h: 0.45,
        fontSize: 11, color: C.text,
      })
    })

    // Footer
    slide.addText(`Généré par TFSReporter — ${new Date().toLocaleDateString('fr-FR')}`, {
      x: 0, y: 7.1, w: 13.33, h: 0.3,
      fontSize: 8, color: C.overlay, align: 'center',
    })
  }

  // ─── SLIDE 2 : KPIs ───────────────────────────────────────────────────
  _slideKpis(pptx, metadata, planData) {
    const C = PptxService.COLORS
    const slide = pptx.addSlide()
    const metrics = planData.metrics

    slide.background = { color: 'F8F8FC' }

    this._slideHeader(slide, 'Synthèse — Indicateurs clés', pptx)

    const kpis = [
      { label: 'Tests Total',    value: metrics.total,       color: C.blue,   textColor: 'FFFFFF' },
      { label: 'Réussis',        value: metrics.passed,      color: C.green,  textColor: '1e1e2e' },
      { label: 'Échoués',        value: metrics.failed,      color: C.red,    textColor: '1e1e2e' },
      { label: 'Bloqués',        value: metrics.blocked,     color: C.yellow, textColor: '1e1e2e' },
      { label: 'Non exécutés',   value: metrics.notExecuted, color: '9399b2', textColor: 'FFFFFF' },
    ]

    const kpiW = 2.2, kpiH = 2.2
    const startX = (13.33 - kpis.length * kpiW - (kpis.length - 1) * 0.2) / 2

    kpis.forEach((kpi, i) => {
      const x = startX + i * (kpiW + 0.2)
      const y = 1.5

      // Fond coloré de la card
      slide.addShape(pptx.ShapeType.roundRect, {
        x, y, w: kpiW, h: kpiH,
        fill: { color: kpi.color },
        line: { color: kpi.color },
        rectRadius: 0.1,
      })

      // Valeur
      slide.addText(String(kpi.value), {
        x, y: y + 0.45, w: kpiW, h: 1,
        fontSize: 48, bold: true, color: kpi.textColor, align: 'center',
      })

      // Label
      slide.addText(kpi.label.toUpperCase(), {
        x, y: y + 1.6, w: kpiW, h: 0.4,
        fontSize: 9, bold: true, color: kpi.textColor + 'CC', align: 'center',
      })
    })

    // Taux de réussite
    const prColor = metrics.passRate >= 80 ? C.green : C.red
    slide.addText(`Taux de réussite : ${metrics.passRate}%`, {
      x: 2, y: 4.2, w: 9.33, h: 0.6,
      fontSize: 20, bold: true, color: prColor, align: 'center',
    })

    if (metrics.alertTriggered) {
      slide.addText('⚠ ALERTE : Taux inférieur au seuil de 80% — Action corrective requise', {
        x: 1, y: 5, w: 11.33, h: 0.5,
        fontSize: 12, color: C.red, align: 'center', bold: true,
      })
    }
  }

  // ─── SLIDE 3 : Taux de réussite ───────────────────────────────────────
  _slidePassRate(pptx, planData) {
    const C = PptxService.COLORS
    const slide = pptx.addSlide()
    const metrics = planData.metrics

    slide.background = { color: 'F8F8FC' }
    this._slideHeader(slide, 'Taux de réussite', pptx)

    // Donut chart via tableau de données
    const chartData = [
      {
        name: 'Résultats',
        labels: ['Réussis', 'Échoués', 'Bloqués', 'Non exécutés'],
        values: [metrics.passed, metrics.failed, metrics.blocked, metrics.notExecuted],
      },
    ]

    slide.addChart(pptx.ChartType.doughnut, chartData, {
      x: 1, y: 1.3, w: 5.5, h: 5,
      chartColors: ['a6e3a1', 'f38ba8', 'f9e2af', '9399b2'],
      holeSize: 50,
      showLegend: true,
      legendPos: 'b',
      showValue: true,
      dataLabelFormatCode: '#',
      dataLabelFontSize: 12,
      dataLabelFontBold: true,
      dataLabelColor: '1e1e2e',
      title: `${metrics.passRate}%`,
      showTitle: false,
    })

    // Stats à droite
    const statsX = 7.5
    const statItems = [
      { label: 'Tests total', value: metrics.total, color: C.blue },
      { label: 'Réussis',    value: `${metrics.passed} (${Math.round(metrics.passed/metrics.total*100)||0}%)`, color: C.green },
      { label: 'Échoués',    value: `${metrics.failed} (${Math.round(metrics.failed/metrics.total*100)||0}%)`, color: C.red },
      { label: 'Bloqués',    value: `${metrics.blocked} (${Math.round(metrics.blocked/metrics.total*100)||0}%)`, color: C.yellow },
      { label: 'Non exec.',  value: `${metrics.notExecuted}`, color: '9399b2' },
    ]

    statItems.forEach((item, i) => {
      const y = 2 + i * 0.9
      slide.addShape(pptx.ShapeType.rect, {
        x: statsX, y, w: 0.08, h: 0.65,
        fill: { color: item.color },
        line: { color: item.color },
      })
      slide.addText(item.label, {
        x: statsX + 0.15, y, w: 5.3, h: 0.3,
        fontSize: 10, color: '4a4a4a',
      })
      slide.addText(String(item.value), {
        x: statsX + 0.15, y: y + 0.3, w: 5.3, h: 0.3,
        fontSize: 14, bold: true, color: item.color,
      })
    })
  }

  // ─── SLIDE 4 : Résultats par statut ──────────────────────────────────
  _slideResultsByStatus(pptx, planData) {
    const C = PptxService.COLORS
    const slide = pptx.addSlide()
    const metrics = planData.metrics

    slide.background = { color: 'F8F8FC' }
    this._slideHeader(slide, 'Résultats par statut', pptx)

    // Bar chart
    const chartData = [{
      name: 'Tests',
      labels: ['Réussis', 'Échoués', 'Bloqués', 'Non exécutés'],
      values: [metrics.passed, metrics.failed, metrics.blocked, metrics.notExecuted],
    }]

    slide.addChart(pptx.ChartType.bar, chartData, {
      x: 0.5, y: 1.3, w: 12.33, h: 4.8,
      chartColors: ['a6e3a1', 'f38ba8', 'f9e2af', '9399b2'],
      showValue: true,
      dataLabelFontSize: 12,
      dataLabelFontBold: true,
      dataLabelColor: '1e1e2e',
      barDir: 'col',
      valAxisMinVal: 0,
      catAxisLabelFontSize: 12,
      showLegend: false,
    })
  }

  // ─── SLIDE 5 : Suites de test ─────────────────────────────────────────
  _slideSuites(pptx, planData) {
    const C = PptxService.COLORS
    const slide = pptx.addSlide()

    slide.background = { color: 'F8F8FC' }
    this._slideHeader(slide, 'Suites de test', pptx)

    const suites = (planData.suites || []).slice(0, 12)
    const tableData = [
      [
        { text: 'Suite de test', options: { bold: true, color: C.white, fill: C.base, fontSize: 10 } },
        { text: 'Type', options: { bold: true, color: C.white, fill: C.base, fontSize: 10 } },
        { text: 'Cas de test', options: { bold: true, color: C.white, fill: C.base, fontSize: 10, align: 'center' } },
      ],
      ...suites.map((suite, i) => [
        { text: suite.name || '—', options: { fontSize: 9, fill: i % 2 === 0 ? 'FFFFFF' : 'F0F0F8' } },
        { text: suite.suiteType || '—', options: { fontSize: 9, fill: i % 2 === 0 ? 'FFFFFF' : 'F0F0F8' } },
        { text: String(suite.testCaseCount || 0), options: { fontSize: 9, align: 'center', fill: i % 2 === 0 ? 'FFFFFF' : 'F0F0F8' } },
      ]),
    ]

    slide.addTable(tableData, {
      x: 0.5, y: 1.3, w: 12.33,
      border: { type: 'solid', color: 'd0d0d0', pt: 0.5 },
      fontFace: 'Calibri',
      rowH: 0.38,
      colW: [8, 2.5, 1.83],
    })

    if ((planData.suites || []).length > 12) {
      slide.addText(`... et ${planData.suites.length - 12} suites supplémentaires`, {
        x: 0.5, y: 6.9, w: 12.33, h: 0.3,
        fontSize: 8, color: C.overlay, italic: true,
      })
    }
  }

  // ─── SLIDE 6 : Bugs ───────────────────────────────────────────────────
  _slideBugs(pptx, planData) {
    const C = PptxService.COLORS
    const slide = pptx.addSlide()
    const metrics = planData.metrics

    slide.background = { color: 'F8F8FC' }
    this._slideHeader(slide, `Bugs identifiés (${metrics.bugsCount})`, pptx)

    const results = planData.results || []
    const bugsWithContext = []
    results.forEach((r) => {
      ;(r.associatedBugs || []).forEach((bug) => {
        bugsWithContext.push({
          bugId: `#${bug.id}`,
          testName: r.testCaseName || '—',
          outcome: r.outcome || '—',
          tester: r.tester || '—',
        })
      })
    })

    const rows = bugsWithContext.slice(0, 14).map((bug, i) => [
      { text: bug.bugId, options: { fontSize: 9, bold: true, color: C.red, fill: i % 2 === 0 ? 'FFFFFF' : 'F0F0F8' } },
      { text: bug.testName, options: { fontSize: 9, fill: i % 2 === 0 ? 'FFFFFF' : 'F0F0F8' } },
      { text: bug.outcome, options: { fontSize: 9, fill: i % 2 === 0 ? 'FFFFFF' : 'F0F0F8' } },
      { text: bug.tester, options: { fontSize: 9, fill: i % 2 === 0 ? 'FFFFFF' : 'F0F0F8' } },
    ])

    const tableData = [
      [
        { text: 'Bug ID', options: { bold: true, color: C.white, fill: 'c0392b', fontSize: 10 } },
        { text: 'Cas de test', options: { bold: true, color: C.white, fill: 'c0392b', fontSize: 10 } },
        { text: 'Statut', options: { bold: true, color: C.white, fill: 'c0392b', fontSize: 10 } },
        { text: 'Testeur', options: { bold: true, color: C.white, fill: 'c0392b', fontSize: 10 } },
      ],
      ...rows,
    ]

    slide.addTable(tableData, {
      x: 0.5, y: 1.3, w: 12.33,
      border: { type: 'solid', color: 'd0d0d0', pt: 0.5 },
      fontFace: 'Calibri',
      rowH: 0.38,
      colW: [1.5, 6, 2, 2.83],
    })
  }

  // ─── SLIDE 7 : Conclusion ─────────────────────────────────────────────
  _slideConclusion(pptx, metadata, planData) {
    const C = PptxService.COLORS
    const slide = pptx.addSlide()
    const metrics = planData.metrics

    slide.background = { color: C.base }

    // Titre
    slide.addText('CONCLUSION', {
      x: 1, y: 1.2, w: 11.33, h: 0.8,
      fontSize: 32, bold: true, color: C.white, align: 'center',
    })

    // Statut global
    const statusColor = metadata.globalStatus === 'Réussi' ? C.green
      : metadata.globalStatus === 'Échoué' ? C.red : C.yellow

    slide.addShape(pptx.ShapeType.roundRect, {
      x: 4.5, y: 2.2, w: 4.33, h: 0.8,
      fill: { color: statusColor + '30' },
      line: { color: statusColor, pt: 2 },
      rectRadius: 0.1,
    })
    slide.addText(metadata.globalStatus || '—', {
      x: 4.5, y: 2.3, w: 4.33, h: 0.6,
      fontSize: 22, bold: true, color: statusColor, align: 'center',
    })

    // Synthèse textuelle
    const passRateColor = metrics.passRate >= 80 ? C.green : C.red
    const summary = [
      `• ${metrics.total} cas de test exécutés sur ${metrics.suitesCount} suites`,
      `• Taux de réussite : ${metrics.passRate}% ${metrics.passRate >= 80 ? '✓' : '⚠'}`,
      `• ${metrics.failed} échec(s) · ${metrics.blocked} blocage(s) · ${metrics.bugsCount} bug(s) identifié(s)`,
    ]

    summary.forEach((line, i) => {
      slide.addText(line, {
        x: 1.5, y: 3.3 + i * 0.65, w: 10.33, h: 0.5,
        fontSize: 14, color: i === 1 ? passRateColor : C.subtext,
        bold: i === 1,
      })
    })

    // Footer
    slide.addText(`TFSReporter · ${metadata.applicationName || 'Application'} · ${new Date().toLocaleDateString('fr-FR')}`, {
      x: 0, y: 7.1, w: 13.33, h: 0.3,
      fontSize: 8, color: C.overlay, align: 'center',
    })
  }

  // ─── HELPER : Header de slide ─────────────────────────────────────────
  _slideHeader(slide, title, pptx) {
    const C = PptxService.COLORS

    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: 13.33, h: 1,
      fill: { color: C.base },
    })

    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0.95, w: 13.33, h: 0.06,
      fill: { color: C.blue },
    })

    slide.addText(title, {
      x: 0.4, y: 0.15, w: 12.5, h: 0.7,
      fontSize: 18, bold: true, color: C.white, fontFace: 'Calibri',
    })

    slide.addText('TFSReporter', {
      x: 10, y: 0.3, w: 3, h: 0.4,
      fontSize: 9, color: C.overlay, align: 'right',
    })
  }
}

module.exports = new PptxService()
