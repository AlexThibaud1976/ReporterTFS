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
  ${traceability.length > 0 ? `
  <div class="section">
    <div class="section-title">Traçabilité — Cas de test → Exigences</div>
    <div class="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Cas de test</th>
            <th>Exigences liées (US / Feature / Epic)</th>
          </tr>
        </thead>
        <tbody>
          ${traceability.map(tc => `
          <tr>
            <td style="font-weight:600">${this._esc(tc.testCaseName)}</td>
            <td>${tc.requirements.length === 0
              ? '<span style="color:var(--overlay);font-style:italic">Aucune exigence liée</span>'
              : tc.requirements.map(req => {
                  const epicPart = req.parent?.parent
                    ? `<span class="wi-badge wi-epic">🏔 <a href="${this._esc(req.parent.parent.url)}" target="_blank" rel="noopener">#${req.parent.parent.id} ${this._esc(req.parent.parent.title)}</a></span><span class="chain-arrow">›</span>`
                    : ''
                  const featPart = req.parent
                    ? `<span class="wi-badge wi-feature">🔷 <a href="${this._esc(req.parent.url)}" target="_blank" rel="noopener">#${req.parent.id} ${this._esc(req.parent.title)}</a></span><span class="chain-arrow">›</span>`
                    : ''
                  return `<div class="req-chain">${epicPart}${featPart}<span class="wi-badge wi-us">📋 <a href="${this._esc(req.url)}" target="_blank" rel="noopener">#${req.id} ${this._esc(req.title)}</a></span><span class="wi-state">${this._esc(req.state)}</span></div>`
                }).join('')
            }</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
  </div>` : ''}

  <!-- BUGS -->
  ${bugDetails.length > 0 ? `
  <div class="section">
    <div class="section-title">Bugs liés (${bugDetails.length})</div>
    <div class="table-scroll">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Titre</th>
            <th>État</th>
            <th>Sévérité</th>
            <th>Priorité</th>
            <th>Assigné à</th>
          </tr>
        </thead>
        <tbody>
          ${bugDetails.map(b => `
          <tr>
            <td><a href="${this._esc(b.url)}" target="_blank" rel="noopener" style="color:#f38ba8;font-weight:600">🐛 #${b.id}</a></td>
            <td>${this._esc(b.title)}</td>
            <td><span class="wi-state" style="font-size:0.8rem;color:var(--subtext);font-style:normal">${this._esc(b.state)}</span></td>
            <td style="color:var(--subtext)">${this._esc(b.severity) || '—'}</td>
            <td style="color:var(--subtext)">${b.priority || '—'}</td>
            <td style="color:var(--subtext)">${this._esc(b.assignedTo) || '—'}</td>
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
const TRACEABILITY = ${traceabilityJson};
const BUG_DETAILS = ${bugDetailsJson};

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
