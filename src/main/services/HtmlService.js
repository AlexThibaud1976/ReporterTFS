const fs = require('fs')

/**
 * HtmlService — Génère un rapport HTML interactif
 * Autonome (tout inline : CSS + JS + Chart.js via CDN)
 * Fonctionnalités : filtrage par statut, tri tableau, graphique
 */
class HtmlService {

  async generate(data, outputPath) {
    try {
      const { metadata, planData } = data
      if (!planData) throw new Error('Données du plan de test manquantes')

      const html = this._buildHtml(metadata, planData)
      fs.writeFileSync(outputPath, html, 'utf8')

      return { success: true, path: outputPath }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  _buildHtml(metadata, planData) {
    const metrics = planData.metrics
    const results = planData.results || []
    const suites = planData.suites || []
    const traceability = planData.traceability || []
    const bugDetails = planData.bugDetails || []
    const generatedAt = new Date().toLocaleString('fr-FR')

    const statusColor = metadata.globalStatus === 'Réussi' ? '#a6e3a1'
      : metadata.globalStatus === 'Échoué' ? '#f38ba8' : '#f9e2af'

    const statusBg = metadata.globalStatus === 'Réussi' ? '#0d1f0d'
      : metadata.globalStatus === 'Échoué' ? '#2a0d10' : '#2a1f0a'

    const resultsJson = JSON.stringify(results.map(r => ({
      id: r.id,
      name: r.testCaseName,
      outcome: r.outcome,
      tester: r.tester,
      duration: r.durationInMs ? (r.durationInMs / 1000).toFixed(2) : null,
      error: r.errorMessage,
      bugs: r.associatedBugs?.length || 0,
      bugLinks: (r.associatedBugs || []).map(b => ({
        id: b.id,
        title: b.title || `Bug #${b.id}`,
        url: b.url || '',
        state: b.state || '',
      })),
    })))

    const traceabilityJson = JSON.stringify(traceability)
    const bugDetailsJson = JSON.stringify(bugDetails)

    // ── Matrice de traçabilité (server-side) ──────────────────────────────
    const _resultsByName = new Map()
    for (const r of results) {
      const key = (r.testCaseName || '').trim().toLowerCase()
      if (!_resultsByName.has(key)) _resultsByName.set(key, r)
    }
    const _tcToSuite = new Map()
    for (const suite of suites) {
      for (const tc of (suite.testCases || [])) {
        _tcToSuite.set(Number(tc.id), suite.name)
      }
    }
    const _reqMap = new Map()
    for (const tc of traceability) {
      for (const req of tc.requirements) {
        if (!_reqMap.has(req.id)) _reqMap.set(req.id, { ...req, testCases: [] })
        const entry = _reqMap.get(req.id)
        if (!entry.testCases.find(t => t.id === tc.testCaseId)) {
          const res = _resultsByName.get(tc.testCaseName.trim().toLowerCase())
          entry.testCases.push({
            id: tc.testCaseId,
            name: tc.testCaseName,
            outcome: res?.outcome || 'NotExecuted',
            suiteName: _tcToSuite.get(tc.testCaseId) || '',
          })
        }
      }
    }
    const reqMatrix = [..._reqMap.values()].map(req => {
      const tests   = req.testCases.length
      const passed  = req.testCases.filter(t => t.outcome === 'Passed').length
      const failed  = req.testCases.filter(t => t.outcome === 'Failed').length
      const blocked = req.testCases.filter(t => t.outcome === 'Blocked').length
      const coverage = tests > 0 ? Math.round((passed / tests) * 100) : 0
      return { ...req, tests, passed, failed, blocked, coverage }
    })
    const _totalLinked   = reqMatrix.reduce((s, r) => s + r.tests, 0)
    const _totalPassed   = reqMatrix.reduce((s, r) => s + r.passed, 0)
    const _testsLinked   = new Set(traceability.filter(t => t.requirements.length > 0).map(t => t.testCaseId)).size
    const tracKpis = {
      reqCovered:   reqMatrix.length,
      testsLinked:  _testsLinked,
      coverageRate: _totalLinked > 0 ? Math.round((_totalPassed / _totalLinked) * 100) : 0,
      bugsCount:    bugDetails.length,
    }
    const bugMatrix = bugDetails.map(bug => {
      let assoc = null
      for (const r of results) {
        if ((r.associatedBugs || []).some(b => String(b.id) === String(bug.id))) {
          const te = traceability.find(t => t.testCaseName === r.testCaseName)
          assoc = { id: te?.testCaseId, name: r.testCaseName }
          break
        }
      }
      return { ...bug, associatedTest: assoc }
    })

    const metricsJson = JSON.stringify({
      labels: ['Réussis', 'Échoués', 'Bloqués', 'Non exécutés'],
      values: [metrics.passed, metrics.failed, metrics.blocked, metrics.notExecuted],
      colors: ['#a6e3a1', '#f38ba8', '#f9e2af', '#6c7086'],
    })

    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rapport de Test — ${this._esc(metadata.applicationName || 'Application')}</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <style>
    :root {
      --base: #1e1e2e; --mantle: #181825; --surface: #313244; --surface1: #45475a;
      --text: #cdd6f4; --subtext: #a6adc8; --overlay: #6c7086;
      --blue: #89b4fa; --green: #a6e3a1; --red: #f38ba8;
      --yellow: #f9e2af; --peach: #fab387; --mauve: #cba6f7;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', -apple-system, sans-serif; background: var(--base); color: var(--text); font-size: 14px; }
    a { color: var(--blue); }
    .container { max-width: 1200px; margin: 0 auto; padding: 24px; }
    
    /* Header */
    .header { background: var(--mantle); border-bottom: 3px solid var(--blue); padding: 24px; margin-bottom: 24px; border-radius: 8px; }
    .header h1 { font-size: 2rem; color: var(--text); margin-bottom: 6px; }
    .header .subtitle { color: var(--blue); font-size: 1.1rem; }
    .header .meta-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; margin-top: 16px; }
    .meta-item { background: var(--surface); padding: 10px 14px; border-radius: 6px; }
    .meta-item .label { font-size: 0.7rem; color: var(--overlay); text-transform: uppercase; letter-spacing: 0.05em; }
    .meta-item .value { font-size: 0.95rem; font-weight: 600; margin-top: 2px; color: var(--text); }
    
    /* Status badge */
    .status-badge { display: inline-flex; align-items: center; padding: 6px 16px; border-radius: 20px; font-weight: 700; font-size: 0.9rem; background: ${statusBg}; color: ${statusColor}; border: 1px solid ${statusColor}; }
    
    /* KPI Cards */
    .kpi-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .kpi-card { background: var(--mantle); border-radius: 8px; padding: 20px; border-left: 4px solid var(--border); }
    .kpi-card .label { font-size: 0.75rem; color: var(--overlay); text-transform: uppercase; letter-spacing: 0.06em; }
    .kpi-card .value { font-size: 2.2rem; font-weight: 700; color: var(--border); line-height: 1.2; }
    .kpi-card .sub { font-size: 0.8rem; color: var(--overlay); }
    
    /* Alert */
    .alert { background: #2a0d10; border: 1px solid var(--red); color: var(--red); padding: 12px 16px; border-radius: 6px; margin-bottom: 20px; font-weight: 600; }
    
    /* Section */
    .section { background: var(--mantle); border-radius: 8px; padding: 20px; margin-bottom: 24px; }
    .section-title { font-size: 1rem; font-weight: 700; color: var(--blue); margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.06em; border-bottom: 1px solid var(--surface); padding-bottom: 8px; }
    
    /* Charts grid */
    .charts-grid { display: grid; grid-template-columns: 1fr 2fr; gap: 20px; margin-bottom: 24px; }
    @media (max-width: 700px) { .charts-grid { grid-template-columns: 1fr; } }
    .chart-box { background: var(--mantle); border-radius: 8px; padding: 20px; }
    .chart-box canvas { max-height: 280px; }
    
    /* Progress bar */
    .progress-bar { height: 10px; background: var(--surface); border-radius: 5px; overflow: hidden; margin: 8px 0; }
    .progress-fill { height: 100%; border-radius: 5px; transition: width 0.5s ease; }
    
    /* Table */
    .filter-bar { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
    .filter-btn { padding: 6px 14px; border-radius: 20px; border: 1px solid var(--surface1); background: var(--surface); color: var(--subtext); cursor: pointer; font-size: 0.8rem; transition: all 0.15s; }
    .filter-btn:hover, .filter-btn.active { border-color: var(--blue); color: var(--blue); background: rgba(137,180,250,0.1); }
    .search-input { padding: 6px 12px; border-radius: 6px; border: 1px solid var(--surface1); background: var(--surface); color: var(--text); font-size: 0.85rem; flex: 1; min-width: 200px; }
    .search-input:focus { outline: none; border-color: var(--blue); }
    table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
    thead th { background: var(--surface); color: var(--subtext); font-weight: 600; padding: 10px 12px; text-align: left; position: sticky; top: 0; cursor: pointer; user-select: none; white-space: nowrap; }
    thead th:hover { color: var(--blue); }
    tbody tr { border-bottom: 1px solid var(--surface); transition: background 0.1s; }
    tbody tr:hover { background: rgba(137,180,250,0.05); }
    tbody td { padding: 9px 12px; color: var(--text); }
    .outcome-badge { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 0.75rem; font-weight: 600; }
    .outcome-Passed      { background: rgba(166,227,161,0.2); color: #a6e3a1; }
    .outcome-Failed      { background: rgba(243,139,168,0.2); color: #f38ba8; }
    .outcome-Blocked     { background: rgba(249,226,175,0.2); color: #f9e2af; }
    .outcome-NotExecuted { background: rgba(108,112,134,0.2); color: #6c7086; }
    .outcome-Inconclusive{ background: rgba(250,179,135,0.2); color: #fab387; }
    .table-scroll { overflow-x: auto; max-height: 500px; overflow-y: auto; }
    .no-results { text-align: center; padding: 40px; color: var(--overlay); }
    
    /* Footer */
    .footer { text-align: center; padding: 24px; color: var(--overlay); font-size: 0.8rem; border-top: 1px solid var(--surface); margin-top: 24px; }
    .footer .tfs-badge { color: var(--blue); font-weight: 600; }

    /* Traceability */
    .req-chain { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; margin: 3px 0; }
    .chain-arrow { color: var(--overlay); font-size: 1rem; }
    .wi-badge { display: inline-flex; align-items: center; gap: 4px; font-size: 0.78rem; padding: 2px 8px; border-radius: 12px; }
    .wi-us      { background: rgba(137,180,250,0.18); color: #89b4fa; }
    .wi-feature { background: rgba(203,166,247,0.18); color: #cba6f7; }
    .wi-epic    { background: rgba(250,179,135,0.18); color: #fab387; }
    .wi-badge a { color: inherit; text-decoration: none; }
    .wi-badge a:hover { text-decoration: underline; }
    .wi-state { font-size: 0.7rem; color: var(--overlay); font-style: italic; }

    /* Traceability KPI gradient cards */
    .trac-kpi-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 16px; margin-bottom: 20px; }
    .trac-kpi { border-radius: 12px; padding: 20px 16px; text-align: center; color: #fff; position: relative; overflow: hidden; }
    .trac-kpi .tk-value { font-size: 2.2rem; font-weight: 800; line-height: 1.1; }
    .trac-kpi .tk-label { font-size: 0.75rem; font-weight: 600; opacity: 0.9; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.05em; }
    .trac-kpi-req     { background: linear-gradient(135deg, #5b6cde 0%, #8b5cf6 100%); }
    .trac-kpi-tests   { background: linear-gradient(135deg, #d946a8 0%, #f472b6 100%); }
    .trac-kpi-cover   { background: linear-gradient(135deg, #059669 0%, #34d399 100%); }
    .trac-kpi-bugs    { background: linear-gradient(135deg, #dc2626 0%, #f87171 100%); }

    /* Matrix table */
    .matrix-expand-btn { background: none; border: 1px solid var(--surface1); border-radius: 4px; color: var(--subtext); cursor: pointer; padding: 2px 7px; font-size: 0.78rem; transition: all 0.15s; }
    .matrix-expand-btn:hover { border-color: var(--blue); color: var(--blue); }
    .matrix-detail { background: rgba(137,180,250,0.04); }
    .matrix-detail td { padding: 10px 16px 10px 40px !important; }
    .tc-pills { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
    .tc-pill { display: inline-flex; align-items: center; gap: 5px; padding: 3px 10px; border-radius: 16px; font-size: 0.78rem; border: 1px solid var(--surface1); background: var(--surface); }
    .tc-pill-id { font-weight: 700; color: var(--blue); }
    .tc-pill-name { color: var(--text); }
    .tc-pill-suite { color: var(--overlay); font-style: italic; }
    .coverage-bar { display: inline-flex; align-items: center; gap: 8px; min-width: 120px; }
    .coverage-bar .bar { flex: 1; height: 8px; background: var(--surface1); border-radius: 4px; overflow: hidden; }
    .coverage-bar .fill { height: 100%; border-radius: 4px; }
    .type-badge { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 0.72rem; font-weight: 700; background: rgba(137,180,250,0.18); color: #89b4fa; }
    .state-badge { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 0.72rem; font-weight: 600; background: rgba(166,227,161,0.18); color: #a6e3a1; }
    .sev-badge { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 0.72rem; font-weight: 700; background: rgba(250,179,135,0.25); color: #fab387; }
    .prio-badge { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 0.72rem; font-weight: 700; background: rgba(249,226,175,0.25); color: #f9e2af; }
  </style>
</head>
<body>
<div class="container">

  <!-- HEADER -->
  <div class="header">
    <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:12px">
      <div>
        <h1>📋 Rapport de Test</h1>
        <div class="subtitle">${this._esc(metadata.applicationName || 'Application')} — ${this._esc(planData.plan?.name || '—')}</div>
      </div>
      <div class="status-badge">${this._esc(metadata.globalStatus || '—')}</div>
    </div>
    <div class="meta-grid" style="margin-top:16px">
      ${this._metaItem('Référence', metadata.projectRef)}
      ${this._metaItem('Change', metadata.changeNumber)}
      ${this._metaItem('Environnement', metadata.testEnvironment)}
      ${this._metaItem('Testeur(s)', metadata.testers)}
      ${this._metaItem('Contact IT', metadata.itContact)}
      ${this._metaItem('Contact métier', metadata.businessContact)}
      ${this._metaItem('Approbateur', metadata.approver)}
      ${this._metaItem('Généré le', generatedAt)}
    </div>
  </div>

  <!-- ALERTE -->
  ${metrics.alertTriggered ? `<div class="alert">⚠ ALERTE QUALITÉ : Taux de réussite (${metrics.passRate}%) inférieur au seuil de 80% — Action corrective requise !</div>` : ''}

  <!-- KPIs -->
  <div class="kpi-row">
    <div class="kpi-card" style="--border: #89b4fa">
      <div class="label">Total</div>
      <div class="value">${metrics.total}</div>
    </div>
    <div class="kpi-card" style="--border: #a6e3a1">
      <div class="label">Réussis</div>
      <div class="value">${metrics.passed}</div>
      <div class="sub">${metrics.passRate}%</div>
    </div>
    <div class="kpi-card" style="--border: #f38ba8">
      <div class="label">Échoués</div>
      <div class="value">${metrics.failed}</div>
    </div>
    <div class="kpi-card" style="--border: #f9e2af">
      <div class="label">Bloqués</div>
      <div class="value">${metrics.blocked}</div>
    </div>
    <div class="kpi-card" style="--border: #6c7086">
      <div class="label">Non exécutés</div>
      <div class="value">${metrics.notExecuted}</div>
    </div>
    <div class="kpi-card" style="--border: #fab387">
      <div class="label">Bugs liés</div>
      <div class="value">${metrics.bugsCount}</div>
    </div>
  </div>

  <!-- CHARTS -->
  <div class="charts-grid">
    <div class="chart-box">
      <div class="section-title">Répartition</div>
      <canvas id="donutChart"></canvas>
    </div>
    <div class="chart-box">
      <div class="section-title">Taux de réussite</div>
      <div style="margin-bottom:8px">
        <span style="font-size:2rem;font-weight:700;color:${metrics.passRate >= 80 ? '#a6e3a1' : '#f38ba8'}">${metrics.passRate}%</span>
        <span style="color:var(--overlay);margin-left:8px;font-size:0.9rem">${metrics.passRate >= 80 ? '✓ Objectif atteint' : '⚠ En dessous de l\'objectif'}</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" style="width:${metrics.passRate}%;background:${metrics.passRate >= 80 ? '#a6e3a1' : '#f38ba8'}"></div>
      </div>
      <canvas id="barChart" style="margin-top:20px;max-height:200px"></canvas>
    </div>
  </div>

  <!-- SUITES -->
  <div class="section">
    <div class="section-title">Suites de test (${suites.length})</div>
    <table>
      <thead>
        <tr>
          <th>Suite</th>
          <th>Type</th>
          <th style="text-align:right">Cas de test</th>
        </tr>
      </thead>
      <tbody>
        ${suites.map(s => `
          <tr>
            <td>${this._esc(s.name)}</td>
            <td><span style="color:var(--subtext)">${this._esc(s.suiteType)}</span></td>
            <td style="text-align:right;font-weight:600">${s.testCaseCount || 0}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  <!-- RÉSULTATS -->
  <div class="section">
    <div class="section-title">Résultats de test (${results.length})</div>
    <div class="filter-bar">
      <input type="text" class="search-input" id="searchInput" placeholder="🔍 Filtrer les cas de test..." oninput="filterTable()">
      <button class="filter-btn active" onclick="setOutcomeFilter('', this)">Tous (${results.length})</button>
      <button class="filter-btn" onclick="setOutcomeFilter('Passed', this)">✓ Réussis (${metrics.passed})</button>
      <button class="filter-btn" onclick="setOutcomeFilter('Failed', this)">✗ Échoués (${metrics.failed})</button>
      <button class="filter-btn" onclick="setOutcomeFilter('Blocked', this)">⊘ Bloqués (${metrics.blocked})</button>
      <button class="filter-btn" onclick="setOutcomeFilter('NotExecuted', this)">○ Non exec. (${metrics.notExecuted})</button>
    </div>
    <div class="table-scroll">
      <table id="resultsTable">
        <thead>
          <tr>
            <th onclick="sortTable(0)">ID ↕</th>
            <th onclick="sortTable(1)">Cas de test ↕</th>
            <th onclick="sortTable(2)">Statut ↕</th>
            <th onclick="sortTable(3)">Testeur ↕</th>
            <th onclick="sortTable(4)">Durée ↕</th>
            <th>Bugs</th>
          </tr>
        </thead>
        <tbody id="resultsBody">
        </tbody>
      </table>
      <div class="no-results" id="noResults" style="display:none">Aucun résultat correspondant au filtre.</div>
    </div>
  </div>

  <!-- TRAÇABILITÉ -->
  ${reqMatrix.length > 0 ? `
  <div class="section">
    <div class="section-title">📊 Matrice de Traçabilité — Requirements / User Stories</div>

    <!-- KPI gradient cards -->
    <div class="trac-kpi-row">
      <div class="trac-kpi trac-kpi-req">
        <div class="tk-value">${tracKpis.reqCovered}</div>
        <div class="tk-label">Requirements Couverts</div>
      </div>
      <div class="trac-kpi trac-kpi-tests">
        <div class="tk-value">${tracKpis.testsLinked}</div>
        <div class="tk-label">Tests de Couverture</div>
      </div>
      <div class="trac-kpi trac-kpi-cover">
        <div class="tk-value">${tracKpis.coverageRate}%</div>
        <div class="tk-label">Taux de Couverture</div>
      </div>
      <div class="trac-kpi trac-kpi-bugs">
        <div class="tk-value">${tracKpis.bugsCount}</div>
        <div class="tk-label">Bugs Rattachés</div>
      </div>
    </div>

    <!-- Matrix table -->
    <div class="table-scroll">
      <table id="matrixTable">
        <thead>
          <tr>
            <th style="width:32px"></th>
            <th>ID</th>
            <th>Titre</th>
            <th>Type</th>
            <th>État</th>
            <th style="text-align:right">Tests</th>
            <th style="text-align:right">✅ Passés</th>
            <th style="text-align:right">❌ Échoués</th>
            <th style="text-align:right">🚫 Bloqués</th>
            <th style="min-width:120px">Couverture</th>
          </tr>
        </thead>
        <tbody>
          ${reqMatrix.map((req, idx) => {
            const pct = req.coverage
            const barColor = pct >= 80 ? '#a6e3a1' : pct >= 50 ? '#f9e2af' : '#f38ba8'
            const tcPills = req.testCases.map(tc =>
              `<span class="tc-pill">
                <span class="tc-pill-id">#${tc.id}</span>
                <span class="tc-pill-name">${this._esc(tc.name)}</span>
                ${tc.suiteName ? `<span class="tc-pill-suite">(Suite: ${this._esc(tc.suiteName)})</span>` : ''}
                <span class="outcome-badge outcome-${tc.outcome || 'NotExecuted'}" style="font-size:0.65rem;padding:1px 6px">${tc.outcome || 'N/A'}</span>
              </span>`
            ).join('')
            const parentChain = (() => {
              const parts = []
              if (req.parent?.parent) parts.push(`<span class="wi-badge wi-epic" style="font-size:0.72rem">🏔 <a href="${this._esc(req.parent.parent.url)}" target="_blank" rel="noopener">#${req.parent.parent.id}</a></span>`)
              if (req.parent)         parts.push(`<span class="wi-badge wi-feature" style="font-size:0.72rem">🔷 <a href="${this._esc(req.parent.url)}" target="_blank" rel="noopener">#${req.parent.id}</a></span>`)
              return parts.length ? parts.join('<span class="chain-arrow" style="font-size:0.8rem">›</span>') + '<span class="chain-arrow" style="font-size:0.8rem">›</span>' : ''
            })()
            return `
          <tr class="matrix-row" onclick="toggleMatrixRow(${idx})" style="cursor:pointer">
            <td style="text-align:center;color:var(--overlay)" id="matrix-arrow-${idx}">▶</td>
            <td><a href="${this._esc(req.url)}" target="_blank" rel="noopener" style="color:#89b4fa;font-weight:700" onclick="event.stopPropagation()">#${req.id}</a></td>
            <td><div style="display:flex;align-items:center;gap:6px">${parentChain}<span style="font-weight:600">${this._esc(req.title)}</span></div></td>
            <td><span class="type-badge">${this._esc(req.type || 'User Story')}</span></td>
            <td><span class="state-badge" style="background:rgba(166,227,161,0.18);color:#a6e3a1">${this._esc(req.state || '')}</span></td>
            <td style="text-align:right;font-weight:700">${req.tests}</td>
            <td style="text-align:right;color:#a6e3a1;font-weight:600">${req.passed}</td>
            <td style="text-align:right;color:#f38ba8;font-weight:600">${req.failed}</td>
            <td style="text-align:right;color:#f9e2af;font-weight:600">${req.blocked}</td>
            <td><div class="coverage-bar"><div class="bar"><div class="fill" style="width:${pct}%;background:${barColor}"></div></div><span style="font-size:0.8rem;font-weight:700;color:${barColor};min-width:36px">${pct}%</span></div></td>
          </tr>
          <tr class="matrix-detail" id="matrix-detail-${idx}" style="display:none">
            <td colspan="10">
              <div style="font-size:0.78rem;color:var(--subtext);margin-bottom:6px;font-weight:600">Tests associés :</div>
              <div class="tc-pills">${tcPills || '<span style="color:var(--overlay);font-style:italic">Aucun test associé</span>'}</div>
            </td>
          </tr>`
          }).join('')}
        </tbody>
      </table>
    </div>
  </div>` : ''}

  <!-- BUGS -->
  ${bugMatrix.length > 0 ? `
  <div class="section">
    <div class="section-title">🐛 Bugs Rattachés aux Tests (${bugMatrix.length})</div>
    <div class="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Bug ID</th>
            <th>Titre</th>
            <th>Sévérité</th>
            <th>Priorité</th>
            <th>État</th>
            <th>Assigné à</th>
            <th>Test Associé</th>
          </tr>
        </thead>
        <tbody>
          ${bugMatrix.map(b => `
          <tr>
            <td><a href="${this._esc(b.url)}" target="_blank" rel="noopener" style="color:#f38ba8;font-weight:700">#${b.id}</a></td>
            <td style="font-weight:500">${this._esc(b.title)}</td>
            <td>${b.severity ? `<span class="sev-badge">${this._esc(b.severity)}</span>` : '<span style="color:var(--overlay)">—</span>'}</td>
            <td>${b.priority ? `<span class="prio-badge">P${b.priority}</span>` : '<span style="color:var(--overlay)">—</span>'}</td>
            <td><span class="state-badge">${this._esc(b.state || '—')}</span></td>
            <td style="color:var(--subtext)">${this._esc(b.assignedTo) || '—'}</td>
            <td>${b.associatedTest
              ? `<span class="tc-pill"><span class="tc-pill-id">#${b.associatedTest.id || '?'}</span><span class="tc-pill-name">${this._esc(b.associatedTest.name)}</span></span>`
              : '<span style="color:var(--overlay);font-style:italic">—</span>'
            }</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
  </div>` : ''}

  <!-- FOOTER -->
  <div class="footer">
    Rapport généré par <span class="tfs-badge">TFSReporter</span> le ${generatedAt}
    <br>
    ${this._esc(metadata.applicationName || '')} · ${this._esc(planData.plan?.name || '')} · ${results.length} cas de test
  </div>
</div>

<script>
// ─── Données ──────────────────────────────────────────────────────────
const RESULTS = ${resultsJson};
const METRICS = ${metricsJson};
// Traceability raw data (available for custom use)
const TRACEABILITY = ${traceabilityJson};
const BUG_DETAILS = ${bugDetailsJson};

// ─── Matrix expand/collapse ───────────────────────────────────────────
function toggleMatrixRow(idx) {
  const detail = document.getElementById('matrix-detail-' + idx);
  const arrow  = document.getElementById('matrix-arrow-' + idx);
  if (!detail) return;
  const open = detail.style.display === 'table-row';
  detail.style.display = open ? 'none' : 'table-row';
  if (arrow) arrow.textContent = open ? '▶' : '▼';
}

// ─── Charts ───────────────────────────────────────────────────────────
const donutCtx = document.getElementById('donutChart').getContext('2d');
new Chart(donutCtx, {
  type: 'doughnut',
  data: {
    labels: METRICS.labels,
    datasets: [{ data: METRICS.values, backgroundColor: METRICS.colors, borderWidth: 2, borderColor: '#1e1e2e' }]
  },
  options: {
    responsive: true,
    plugins: {
      legend: { position: 'bottom', labels: { color: '#a6adc8', padding: 12, font: { size: 11 } } }
    },
    cutout: '60%'
  }
});

const barCtx = document.getElementById('barChart').getContext('2d');
new Chart(barCtx, {
  type: 'bar',
  data: {
    labels: METRICS.labels,
    datasets: [{
      data: METRICS.values,
      backgroundColor: METRICS.colors.map(c => c + '80'),
      borderColor: METRICS.colors,
      borderWidth: 1,
      borderRadius: 4,
    }]
  },
  options: {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { color: '#313244' }, ticks: { color: '#a6adc8' } },
      y: { grid: { color: '#313244' }, ticks: { color: '#a6adc8' }, beginAtZero: true }
    }
  }
});

// ─── Table ────────────────────────────────────────────────────────────
let currentOutcomeFilter = '';
let sortCol = -1, sortAsc = true;

function renderTable(data) {
  const tbody = document.getElementById('resultsBody');
  const noResults = document.getElementById('noResults');
  tbody.innerHTML = '';
  if (!data.length) { noResults.style.display = ''; return; }
  noResults.style.display = 'none';
  data.forEach(r => {
    const tr = document.createElement('tr');
    tr.innerHTML =
      '<td style="color:var(--overlay);font-size:0.75rem">' + (r.id || '—') + '</td>' +
      '<td>' + esc(r.name || '—') + '</td>' +
      '<td><span class="outcome-badge outcome-' + (r.outcome || 'NotExecuted') + '">' + (r.outcome || '—') + '</span></td>' +
      '<td>' + esc(r.tester || '—') + '</td>' +
      '<td style="color:var(--subtext)">' + (r.duration ? r.duration + 's' : '—') + '</td>' +
      '<td>' + (r.bugLinks && r.bugLinks.length > 0
        ? r.bugLinks.map(b => b.url
            ? '<a href="' + b.url + '" target="_blank" rel="noopener" style="color:#f38ba8;font-weight:600;display:inline-block;margin:1px 3px">🐛 #' + b.id + '</a>'
            : '<span style="color:#f38ba8;font-weight:600">🐛 #' + b.id + '</span>'
          ).join(' ')
        : '') + '</td>';
    tbody.appendChild(tr);
  });
}

function getFilteredData() {
  const search = document.getElementById('searchInput').value.toLowerCase();
  return RESULTS.filter(r => {
    const matchOutcome = !currentOutcomeFilter || r.outcome === currentOutcomeFilter;
    const matchSearch = !search || (r.name || '').toLowerCase().includes(search) || (r.tester || '').toLowerCase().includes(search);
    return matchOutcome && matchSearch;
  });
}

function filterTable() { renderTable(getFilteredData()); }

function setOutcomeFilter(outcome, btn) {
  currentOutcomeFilter = outcome;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  filterTable();
}

function sortTable(col) {
  if (sortCol === col) sortAsc = !sortAsc;
  else { sortCol = col; sortAsc = true; }
  const keys = ['id', 'name', 'outcome', 'tester', 'duration'];
  const key = keys[col];
  const data = getFilteredData().sort((a, b) => {
    const va = a[key] ?? '', vb = b[key] ?? '';
    return sortAsc ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
  });
  renderTable(data);
}

function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// Init
renderTable(RESULTS);
</script>
</body>
</html>`
  }

  _metaItem(label, value) {
    return `<div class="meta-item">
      <div class="label">${this._esc(label)}</div>
      <div class="value">${this._esc(value || '—')}</div>
    </div>`
  }

  _esc(str) {
    if (!str) return ''
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  }
}

module.exports = new HtmlService()
