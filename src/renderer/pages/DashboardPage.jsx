import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box, Typography, Card, CardContent, Grid,
  Button, LinearProgress, Alert, CircularProgress,
  Select, MenuItem, FormControl, InputLabel, Table,
  TableBody, TableCell, TableHead, TableRow, Chip,
  Collapse, IconButton, Tooltip, Checkbox, ListItemText, OutlinedInput,
} from '@mui/material'
import {
  Add, FolderOpen, Assessment, CheckCircle, Cancel, Block,
  HourglassEmpty, Warning, TrendingUp, KeyboardArrowDown, KeyboardArrowRight,
  AccountTree, BugReport, Link as LinkIcon, FilterList,
} from '@mui/icons-material'
import { useAdoStore } from '../store/adoStore'
import { useAuthStore } from '../store/authStore'
import { palette } from '../theme/theme'

export default function DashboardPage() {
  const navigate = useNavigate()
  const { activeConnection } = useAuthStore()
  const {
    projects, selectedProject, testPlans, selectedPlan, fullPlanData,
    availableSuites, selectedSuiteIds, setSuiteFilter,
    isLoading, loadingStep, error,
    loadProjects, selectProject, selectPlan, extractFullPlanData,
  } = useAdoStore()

  useEffect(() => { if (projects.length === 0) loadProjects() }, [])

  const metrics = fullPlanData?.metrics
  const history = fullPlanData?.history || []
  const suiteMetrics = fullPlanData?.suiteMetrics || []

  return (
    <Box sx={{ p: 3, height: '100%', overflow: 'auto' }}>

      {/* ─── En-tête ──────────────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h2">Tableau de bord</Typography>
          <Typography variant="body2" sx={{ mt: 0.5 }}>
            Connecté à <strong style={{ color: palette.blue }}>{activeConnection?.organisation || activeConnection?.name}</strong>
            {activeConnection?.project && <> — projet <strong style={{ color: palette.sapphire }}>{activeConnection.project}</strong></>}
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={() => navigate('/report')} disabled={!fullPlanData}>
          Nouveau rapport
        </Button>
      </Box>

      {/* ─── Chargement / Erreur ──────────────────────────────────────── */}
      {isLoading && (
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
            <CircularProgress size={16} />
            <Typography variant="body2">{loadingStep}</Typography>
          </Box>
          <LinearProgress />
        </Box>
      )}
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {/* ─── Sélecteurs ───────────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel>Projet</InputLabel>
          <Select
            value={selectedProject?.name || ''} label="Projet"
            onChange={(e) => { const p = projects.find(p => p.name === e.target.value); if (p) selectProject(p) }}
            disabled={isLoading || projects.length === 0}
          >
            {projects.map(p => <MenuItem key={p.id} value={p.name}>{p.name}</MenuItem>)}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 280 }}>
          <InputLabel>Plan de test</InputLabel>
          <Select
            value={selectedPlan?.id || ''} label="Plan de test"
            onChange={(e) => { const p = testPlans.find(p => p.id === e.target.value); if (p) selectPlan(p) }}
            disabled={isLoading || testPlans.length === 0}
          >
            {testPlans.map(p => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
          </Select>
        </FormControl>

        {/* Suite filter — visible seulement si le plan a des suites */}
        {availableSuites.length > 0 && (
          <Tooltip title={selectedSuiteIds.length > 0 ? `Filtre actif : ${selectedSuiteIds.length} suite(s)` : 'Toutes les suites incluses'} arrow>
            <FormControl size="small" sx={{ minWidth: 260 }}>
              <InputLabel shrink sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <FilterList sx={{ fontSize: 14 }} /> Périmètre suites
              </InputLabel>
              <Select
                multiple
                displayEmpty
                value={selectedSuiteIds}
                onChange={(e) => setSuiteFilter(e.target.value)}
                input={<OutlinedInput notched label="Périmètre suites" />}
                renderValue={(selected) =>
                  selected.length === 0
                    ? <Typography variant="caption" sx={{ color: palette.overlay0, fontStyle: 'italic' }}>Toutes les suites ({availableSuites.length})</Typography>
                    : <Typography variant="caption">{selected.length} suite{selected.length > 1 ? 's' : ''} sélectionnée{selected.length > 1 ? 's' : ''}</Typography>
                }
                disabled={isLoading}
                sx={{ '& .MuiSelect-select': { py: 1 } }}
              >
                {availableSuites.map(s => (
                  <MenuItem key={s.id} value={s.id} dense>
                    <Checkbox size="small" checked={selectedSuiteIds.includes(s.id)} sx={{ py: 0.5 }} />
                    <ListItemText
                      primary={s.name}
                      secondary={s.testCaseCount != null ? `${s.testCaseCount} cas` : undefined}
                      primaryTypographyProps={{ variant: 'body2' }}
                      secondaryTypographyProps={{ variant: 'caption' }}
                    />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Tooltip>
        )}

        <Button variant="outlined" startIcon={isLoading ? <CircularProgress size={16} /> : <Assessment />}
          onClick={extractFullPlanData} disabled={!selectedPlan || isLoading}>
          Analyser
        </Button>
      </Box>

      {/* ─── Dashboard métriques ──────────────────────────────────────── */}
      {metrics && (
        <>
          {metrics.alertTriggered && (
            <Alert severity="warning" icon={<Warning />} sx={{ mb: 2 }}>
              ⚠️ Taux de réussite ({metrics.passRate}%) inférieur au seuil de 80% — Action corrective requise !
            </Alert>
          )}

          {/* KPIs */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <KpiCard label="Tests Total" value={metrics.total} icon={<Assessment />} color={palette.blue} />
            <KpiCard label="Réussis" value={metrics.passed} icon={<CheckCircle />} color={palette.green} subtext={metrics.passRate + '%'} />
            <KpiCard label="Échoués" value={metrics.failed} icon={<Cancel />} color={palette.red} />
            <KpiCard label="Bloqués" value={metrics.blocked} icon={<Block />} color={palette.yellow} />
            <KpiCard label="Non exécutés" value={metrics.notExecuted} icon={<HourglassEmpty />} color={palette.overlay1} />
            <KpiCard label="Bugs liés" value={metrics.bugsCount} icon={<Warning />} color={palette.peach} />
          </Grid>

          {/* Barre taux global */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>Taux de réussite global</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: metrics.passRate >= 80 ? palette.green : palette.red }}>
                  {metrics.passRate}%
                </Typography>
              </Box>
              <LinearProgress variant="determinate" value={metrics.passRate}
                sx={{ height: 10, '& .MuiLinearProgress-bar': { backgroundColor: metrics.passRate >= 80 ? palette.green : palette.red } }}
              />
              <Box sx={{ display: 'flex', gap: 3, mt: 2, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                {[
                  { label: 'Plan', value: fullPlanData.plan?.name },
                  { label: 'Suites', value: metrics.suitesCount },
                  { label: 'Extrait le', value: new Date(fullPlanData.extractedAt).toLocaleString('fr-FR') },
                  { label: 'Dernier run', value: fullPlanData.latestRun?.name },
                ].filter(x => x.value).map(({ label, value }) => (
                  <Box key={label}>
                    <Typography variant="caption" sx={{ color: palette.overlay0 }}>{label}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>{value}</Typography>
                  </Box>
                ))}
                {fullPlanData.filteredSuiteIds && (
                  <Box>
                    <Typography variant="caption" sx={{ color: palette.overlay0 }}>Périmètre</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.2 }}>
                      <FilterList sx={{ fontSize: 13, color: palette.sapphire }} />
                      <Typography variant="body2" sx={{ fontWeight: 500, color: palette.sapphire }}>
                        {fullPlanData.filteredSuiteIds.length} suite{fullPlanData.filteredSuiteIds.length > 1 ? 's' : ''} sélectionnée{fullPlanData.filteredSuiteIds.length > 1 ? 's' : ''}
                      </Typography>
                    </Box>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>

          <Grid container spacing={3} sx={{ mb: 3 }}>
            {/* Graphique donut résultats */}
            <Grid item xs={12} md={4}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h5" sx={{ mb: 2 }}>Répartition des résultats</Typography>
                  <DonutChart metrics={metrics} />
                </CardContent>
              </Card>
            </Grid>

            {/* Historique */}
            {history.length > 1 && (
              <Grid item xs={12} md={8}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <TrendingUp sx={{ color: palette.blue, fontSize: 18 }} />
                      <Typography variant="h5">Historique des exécutions</Typography>
                    </Box>
                    <HistoryChart history={history} />
                  </CardContent>
                </Card>
              </Grid>
            )}
          </Grid>

          {/* Tableau par suite */}
          {suiteMetrics.length > 0 && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h5" sx={{ mb: 2 }}>Résultats par suite de test</Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ '& th': { fontWeight: 700, color: palette.subtext0, fontSize: '0.75rem', borderColor: palette.surface1 } }}>
                      <TableCell>Suite</TableCell>
                      <TableCell align="center">Total</TableCell>
                      <TableCell align="center">Réussis</TableCell>
                      <TableCell align="center">Échoués</TableCell>
                      <TableCell align="center">Bloqués</TableCell>
                      <TableCell align="center">Taux</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {suiteMetrics.map((sm) => (
                      <TableRow key={sm.suiteId} sx={{ '& td': { borderColor: palette.surface1 }, '&:hover': { bgcolor: palette.surface0 } }}>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>{sm.suiteName || `Suite ${sm.suiteId}`}</Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body2">{sm.total}</Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body2" sx={{ color: palette.green, fontWeight: 600 }}>{sm.passed}</Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body2" sx={{ color: sm.failed > 0 ? palette.red : palette.overlay0, fontWeight: sm.failed > 0 ? 600 : 400 }}>{sm.failed}</Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body2" sx={{ color: sm.blocked > 0 ? palette.yellow : palette.overlay0 }}>{sm.blocked}</Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={`${sm.passRate}%`}
                            size="small"
                            sx={{
                              bgcolor: sm.passRate >= 80 ? `${palette.green}25` : sm.passRate >= 50 ? `${palette.yellow}25` : `${palette.red}25`,
                              color: sm.passRate >= 80 ? palette.green : sm.passRate >= 50 ? palette.yellow : palette.red,
                              fontWeight: 700, fontSize: '0.75rem',
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Matrice de traçabilité */}
          {(fullPlanData?.traceability?.length > 0 || fullPlanData?.traceabilityError) && (
            <TraceabilityMatrix planData={fullPlanData} />
          )}

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button variant="contained" size="large" startIcon={<Add />} onClick={() => navigate('/report')}>
              Générer le rapport
            </Button>
          </Box>
        </>
      )}

      {/* ─── État vide ────────────────────────────────────────────────── */}
      {!metrics && !isLoading && (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 8, color: palette.overlay0 }}>
          <FolderOpen sx={{ fontSize: 64, mb: 2, opacity: 0.4 }} />
          <Typography variant="h5" sx={{ mb: 1 }}>Sélectionnez un plan de test</Typography>
          <Typography variant="body2">Choisissez un projet et un plan de test, puis cliquez sur "Analyser"</Typography>
        </Box>
      )}
    </Box>
  )
}

// ─── KPI Card ──────────────────────────────────────────────────────────────
function KpiCard({ label, value, icon, color, subtext }) {
  return (
    <Grid item xs={6} sm={4} md={2}>
      <Card>
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="caption" sx={{ color: palette.overlay1 }}>{label}</Typography>
            <Box sx={{ color, opacity: 0.8 }}>{icon}</Box>
          </Box>
          <Typography variant="h3" sx={{ color, fontWeight: 700 }}>{value ?? '—'}</Typography>
          {subtext && <Typography variant="caption" sx={{ color: palette.overlay0 }}>{subtext}</Typography>}
        </CardContent>
      </Card>
    </Grid>
  )
}

// ─── Donut Chart ───────────────────────────────────────────────────────────
function DonutChart({ metrics }) {
  const canvasRef = useRef(null)
  const wrapperRef = useRef(null)

  const draw = () => {
    const canvas = canvasRef.current
    const wrapper = wrapperRef.current
    if (!canvas || !wrapper) return

    const dpr = window.devicePixelRatio || 1
    const W = wrapper.clientWidth
    // Hauteur = zone donut + légende dynamique
    const segments = [
      { value: metrics.passed,      color: '#a6e3a1', label: 'Réussis' },
      { value: metrics.failed,      color: '#f38ba8', label: 'Échoués' },
      { value: metrics.blocked,     color: '#f9e2af', label: 'Bloqués' },
      { value: metrics.notExecuted, color: '#6c7086', label: 'Non exécutés' },
    ].filter(s => s.value > 0)

    const total = segments.reduce((a, s) => a + s.value, 0)
    if (!W || total === 0) return

    const legendH = segments.length * 22 + 12
    const donutSize = Math.min(W, 220)
    const H = donutSize + legendH

    canvas.width  = W * dpr
    canvas.height = H * dpr
    canvas.style.width  = W + 'px'
    canvas.style.height = H + 'px'

    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, W, H)

    const cx = W / 2
    const cy = donutSize / 2
    const r  = donutSize * 0.40
    const ri = r * 0.62
    const gap = 0.025 // espace entre segments (rad)

    // Ombre globale douce
    ctx.shadowColor = 'rgba(0,0,0,0.4)'
    ctx.shadowBlur = 12

    let angle = -Math.PI / 2
    segments.forEach(seg => {
      const sweep = (seg.value / total) * 2 * Math.PI - gap
      ctx.beginPath()
      ctx.arc(cx, cy, r, angle + gap / 2, angle + gap / 2 + sweep)
      ctx.arc(cx, cy, ri, angle + gap / 2 + sweep, angle + gap / 2, true)
      ctx.closePath()
      ctx.fillStyle = seg.color
      ctx.fill()
      angle += sweep + gap
    })

    ctx.shadowBlur = 0

    // Fond du trou
    ctx.beginPath()
    ctx.arc(cx, cy, ri - 2, 0, 2 * Math.PI)
    ctx.fillStyle = '#1e1e2e'
    ctx.fill()

    // Anneau intérieur décoratif
    ctx.beginPath()
    ctx.arc(cx, cy, ri - 2, 0, 2 * Math.PI)
    ctx.strokeStyle = '#313244'
    ctx.lineWidth = 1.5
    ctx.stroke()

    // Texte centre : taux
    const rateColor = metrics.passRate >= 80 ? '#a6e3a1' : metrics.passRate >= 50 ? '#f9e2af' : '#f38ba8'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = rateColor
    ctx.font = `bold ${Math.round(r * 0.52)}px Inter, sans-serif`
    ctx.fillText(metrics.passRate + '%', cx, cy - r * 0.12)
    ctx.fillStyle = '#6c7086'
    ctx.font = `${Math.round(r * 0.25)}px Inter, sans-serif`
    ctx.fillText('réussite', cx, cy + r * 0.22)

    // Légende
    const legendTop = donutSize + 8
    const colW = W / 2
    segments.forEach((seg, i) => {
      const col = i % 2
      const row = Math.floor(i / 2)
      const lx = col === 0 ? 8 : colW + 8
      const ly = legendTop + row * 22

      // Pastille
      ctx.beginPath()
      ctx.roundRect(lx, ly + 2, 10, 10, 3)
      ctx.fillStyle = seg.color
      ctx.fill()

      ctx.fillStyle = '#a6adc8'
      ctx.font = '11px Inter, sans-serif'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
      ctx.fillText(`${seg.label}: ${seg.value}`, lx + 15, ly + 2)
    })
  }

  useEffect(() => {
    draw()
    const ro = new ResizeObserver(draw)
    if (wrapperRef.current) ro.observe(wrapperRef.current)
    return () => ro.disconnect()
  }, [metrics])

  return (
    <Box ref={wrapperRef} sx={{ width: '100%' }}>
      <canvas ref={canvasRef} style={{ display: 'block' }} />
    </Box>
  )
}

// ─── History Chart ─────────────────────────────────────────────────────────
function HistoryChart({ history }) {
  const canvasRef = useRef(null)
  const wrapperRef = useRef(null)

  const draw = () => {
    const canvas = canvasRef.current
    const wrapper = wrapperRef.current
    if (!canvas || !wrapper || history.length < 2) return

    const dpr = window.devicePixelRatio || 1
    const W = wrapper.clientWidth
    const H = 220

    canvas.width  = W * dpr
    canvas.height = H * dpr
    canvas.style.width  = W + 'px'
    canvas.style.height = H + 'px'

    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, W, H)

    const pad = { top: 28, right: 16, bottom: 36, left: 44 }
    const cW = W - pad.left - pad.right
    const cH = H - pad.top - pad.bottom

    // ── Grille ──
    ctx.strokeStyle = '#2a2a3e'
    ctx.lineWidth = 1
    ;[0, 25, 50, 75, 100].forEach(pct => {
      const y = pad.top + cH - (pct / 100) * cH
      ctx.beginPath()
      ctx.moveTo(pad.left, y)
      ctx.lineTo(pad.left + cW, y)
      ctx.stroke()
      ctx.fillStyle = '#585b70'
      ctx.font = '10px Inter, sans-serif'
      ctx.textAlign = 'right'
      ctx.textBaseline = 'middle'
      ctx.fillText(pct + '%', pad.left - 6, y)
    })

    // ── Seuil 80% ──
    const y80 = pad.top + cH - (80 / 100) * cH
    ctx.save()
    ctx.strokeStyle = '#f9e2af55'
    ctx.lineWidth = 1
    ctx.setLineDash([5, 5])
    ctx.beginPath()
    ctx.moveTo(pad.left, y80)
    ctx.lineTo(pad.left + cW, y80)
    ctx.stroke()
    ctx.restore()

    // Label seuil
    ctx.fillStyle = '#f9e2af99'
    ctx.font = '9px Inter, sans-serif'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'bottom'
    ctx.fillText('Objectif 80%', pad.left + 4, y80 - 2)

    // ── Points ──
    const step = history.length > 1 ? cW / (history.length - 1) : cW
    const pts = history.map((h, i) => ({
      x: pad.left + i * step,
      y: pad.top + cH - (Math.min(100, Math.max(0, h.passRate)) / 100) * cH,
      rate: h.passRate,
      date: h.date,
    }))

    // Aire sous la courbe (gradient)
    const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + cH)
    grad.addColorStop(0, '#89b4fa33')
    grad.addColorStop(1, '#89b4fa03')

    ctx.beginPath()
    ctx.moveTo(pts[0].x, pad.top + cH)
    ctx.lineTo(pts[0].x, pts[0].y)
    for (let i = 1; i < pts.length; i++) {
      const cpx = (pts[i - 1].x + pts[i].x) / 2
      ctx.bezierCurveTo(cpx, pts[i - 1].y, cpx, pts[i].y, pts[i].x, pts[i].y)
    }
    ctx.lineTo(pts[pts.length - 1].x, pad.top + cH)
    ctx.closePath()
    ctx.fillStyle = grad
    ctx.fill()

    // Ligne principale (bezier)
    ctx.beginPath()
    ctx.moveTo(pts[0].x, pts[0].y)
    for (let i = 1; i < pts.length; i++) {
      const cpx = (pts[i - 1].x + pts[i].x) / 2
      ctx.bezierCurveTo(cpx, pts[i - 1].y, cpx, pts[i].y, pts[i].x, pts[i].y)
    }
    ctx.strokeStyle = '#89b4fa'
    ctx.lineWidth = 2.5
    ctx.lineJoin = 'round'
    ctx.stroke()

    // Points + labels
    const maxLabels = Math.floor(cW / 52) // densité adaptative
    const labelStep = Math.max(1, Math.ceil(pts.length / maxLabels))

    pts.forEach((p, i) => {
      const color = p.rate >= 80 ? '#a6e3a1' : p.rate >= 50 ? '#f9e2af' : '#f38ba8'

      // Halo
      ctx.beginPath()
      ctx.arc(p.x, p.y, 7, 0, 2 * Math.PI)
      ctx.fillStyle = color + '30'
      ctx.fill()

      // Point
      ctx.beginPath()
      ctx.arc(p.x, p.y, 4.5, 0, 2 * Math.PI)
      ctx.fillStyle = color
      ctx.fill()
      ctx.strokeStyle = '#1e1e2e'
      ctx.lineWidth = 1.5
      ctx.stroke()

      // Label % au-dessus
      ctx.fillStyle = '#cdd6f4'
      ctx.font = `bold 10px Inter, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'bottom'
      ctx.fillText(p.rate + '%', p.x, p.y - 9)

      // Date axe X (densité adaptive)
      if (i % labelStep === 0 || i === pts.length - 1) {
        const label = p.date
          ? new Date(p.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
          : `R${i + 1}`
        ctx.fillStyle = '#585b70'
        ctx.font = '10px Inter, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        ctx.fillText(label, p.x, pad.top + cH + 8)
      }
    })
  }

  useEffect(() => {
    draw()
    const ro = new ResizeObserver(draw)
    if (wrapperRef.current) ro.observe(wrapperRef.current)
    return () => ro.disconnect()
  }, [history])

  return (
    <Box ref={wrapperRef} sx={{ width: '100%' }}>
      <canvas ref={canvasRef} style={{ display: 'block' }} />
    </Box>
  )
}

// ─── Traceability Matrix ───────────────────────────────────────────────────
function TraceabilityMatrix({ planData }) {
  const traceability = planData.traceability || []
  const results      = planData.results || []
  const bugDetails   = planData.bugDetails || []
  const adoBaseUrl   = planData.adoBaseUrl || ''
  const error        = planData.traceabilityError || null
  const [expanded, setExpanded] = useState({})

  // Build reverse map: testCaseName → result
  const resultByName = new Map()
  for (const r of results) {
    const key = (r.testCaseName || '').trim().toLowerCase()
    if (!resultByName.has(key)) resultByName.set(key, r)
  }

  // Build suite lookup from suites array
  const tcToSuite = new Map()
  for (const suite of (planData.suites || [])) {
    for (const tc of (suite.testCases || [])) {
      tcToSuite.set(Number(tc.id), suite.name)
    }
  }

  // Build requirement matrix (one row per req)
  const reqMap = new Map()
  for (const tc of traceability) {
    for (const req of tc.requirements) {
      if (!reqMap.has(req.id)) reqMap.set(req.id, { ...req, testCases: [] })
      const entry = reqMap.get(req.id)
      if (!entry.testCases.find(t => t.id === tc.testCaseId)) {
        const res = resultByName.get(tc.testCaseName.trim().toLowerCase())
        entry.testCases.push({
          id: tc.testCaseId,
          name: tc.testCaseName,
          outcome: res?.outcome || 'NotExecuted',
          suiteName: tcToSuite.get(tc.testCaseId) || '',
        })
      }
    }
  }
  const reqMatrix = [...reqMap.values()].map(req => {
    const tests   = req.testCases.length
    const passed  = req.testCases.filter(t => t.outcome === 'Passed').length
    const failed  = req.testCases.filter(t => t.outcome === 'Failed').length
    const blocked = req.testCases.filter(t => t.outcome === 'Blocked').length
    const coverage = tests > 0 ? Math.round((passed / tests) * 100) : 0
    return { ...req, tests, passed, failed, blocked, coverage }
  })

  const totalLinked = reqMatrix.reduce((s, r) => s + r.tests, 0)
  const totalPassed = reqMatrix.reduce((s, r) => s + r.passed, 0)
  const testsLinked = new Set(traceability.filter(t => t.requirements.length > 0).map(t => t.testCaseId)).size
  const coverageRate = totalLinked > 0 ? Math.round((totalPassed / totalLinked) * 100) : 0

  // Fallback bug list
  let bugList = bugDetails.length > 0 ? bugDetails : []
  if (bugList.length === 0) {
    const seen = new Set()
    for (const r of results) {
      for (const b of (r.associatedBugs || [])) {
        if (!seen.has(String(b.id))) {
          seen.add(String(b.id))
          bugList.push({
            id: b.id, title: b.title || `Bug #${b.id}`, state: b.state || '',
            severity: b.severity || '', priority: b.priority || '',
            assignedTo: b.assignedTo || '',
            url: b.url || (adoBaseUrl ? `${adoBaseUrl}/_workitems/edit/${b.id}` : ''),
            testCase: { name: r.testCaseName },
          })
        }
      }
    }
  }
  // Carte inverse bug→testCase depuis enrichedResults (pour les bugDetails sans testCase)
  const bugTestCaseMap = new Map()
  for (const r of results) {
    for (const b of (r.associatedBugs || [])) {
      if (!bugTestCaseMap.has(String(b.id))) {
        bugTestCaseMap.set(String(b.id), { id: r.testCaseId, name: r.testCaseName })
      }
    }
  }
  const bugMatrix = bugList.map(bug => ({
    ...bug,
    associatedTest: bug.testCase || bugTestCaseMap.get(String(bug.id)) || null,
  }))

  const openLink = (url) => { if (url) window.open(url, '_blank') }

  const outcomeColor = (o) => ({
    Passed: palette.green, Failed: palette.red, Blocked: palette.yellow,
  }[o] || palette.overlay0)

  const GRADIENT_CARDS = [
    { label: 'Requirements Couverts', value: reqMatrix.length, bg: 'linear-gradient(135deg,#5b6cde,#8b5cf6)' },
    { label: 'Tests de Couverture',   value: testsLinked,      bg: 'linear-gradient(135deg,#d946a8,#f472b6)' },
    { label: 'Taux de Couverture',    value: `${coverageRate}%`, bg: 'linear-gradient(135deg,#059669,#34d399)' },
    { label: 'Bugs Rattachés',        value: bugMatrix.length, bg: 'linear-gradient(135deg,#dc2626,#f87171)' },
  ]

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <AccountTree sx={{ color: palette.blue, fontSize: 18 }} />
          <Typography variant="h5">Matrice de Traçabilité — Requirements / User Stories</Typography>
        </Box>

        {/* Error */}
        {error && (
          <Alert severity="warning" sx={{ mb: 2, fontSize: '0.8rem' }}>
            Traçabilité non disponible : {error}
            <Typography variant="caption" display="block" sx={{ mt: 0.5, color: 'text.secondary' }}>
              Vérifiez les permissions de lecture sur l'API Work Items (PAT).
            </Typography>
          </Alert>
        )}

        {/* KPI gradient cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {GRADIENT_CARDS.map(card => (
            <Grid item xs={6} sm={3} key={card.label}>
              <Box sx={{
                borderRadius: 2, p: 2.5, textAlign: 'center', color: '#fff',
                background: card.bg,
              }}>
                <Typography sx={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1.1 }}>{card.value}</Typography>
                <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, opacity: 0.9, mt: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {card.label}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>

        {/* Matrix table */}
        {reqMatrix.length > 0 && (
          <>
            <Typography variant="h5" sx={{ mb: 1.5 }}>
              📊 Matrice Requirements / User Stories
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 700, color: palette.subtext0, fontSize: '0.75rem', borderColor: palette.surface1, bgcolor: palette.surface0 } }}>
                  <TableCell padding="checkbox" />
                  <TableCell>ID</TableCell>
                  <TableCell>Titre</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>État</TableCell>
                  <TableCell align="right">Tests</TableCell>
                  <TableCell align="right">✅ Passés</TableCell>
                  <TableCell align="right">❌ Échoués</TableCell>
                  <TableCell align="right">🚫 Bloqués</TableCell>
                  <TableCell sx={{ minWidth: 140 }}>Couverture</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reqMatrix.map((req) => {
                  const isOpen = !!expanded[req.id]
                  const barColor = req.coverage >= 80 ? palette.green : req.coverage >= 50 ? palette.yellow : palette.red
                  return (
                    <React.Fragment key={req.id}>
                      <TableRow
                        hover
                        onClick={() => setExpanded(e => ({ ...e, [req.id]: !e[req.id] }))}
                        sx={{ cursor: 'pointer', '& td': { borderColor: palette.surface1 } }}
                      >
                        <TableCell padding="checkbox">
                          <IconButton size="small" sx={{ color: palette.overlay0 }}>
                            {isOpen ? <KeyboardArrowDown fontSize="small" /> : <KeyboardArrowRight fontSize="small" />}
                          </IconButton>
                        </TableCell>
                        <TableCell>
                          <Tooltip title="Ouvrir dans ADO">
                            <Typography
                              component="a"
                              onClick={(e) => { e.stopPropagation(); openLink(req.url) }}
                              sx={{ color: palette.blue, fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                            >
                              #{req.id}
                            </Typography>
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                            {req.parent?.parent && (
                              <><Chip label={`🏔 #${req.parent.parent.id}`} size="small" onClick={(e) => { e.stopPropagation(); openLink(req.parent.parent.url) }}
                                sx={{ fontSize: '0.65rem', height: 18, bgcolor: `${palette.peach}22`, color: palette.peach, cursor: 'pointer' }} />
                              <Typography sx={{ color: palette.overlay0, fontSize: '0.7rem' }}>›</Typography></>
                            )}
                            {req.parent && (
                              <><Chip label={`🔷 #${req.parent.id}`} size="small" onClick={(e) => { e.stopPropagation(); openLink(req.parent.url) }}
                                sx={{ fontSize: '0.65rem', height: 18, bgcolor: `${palette.mauve}22`, color: palette.mauve, cursor: 'pointer' }} />
                              <Typography sx={{ color: palette.overlay0, fontSize: '0.7rem' }}>›</Typography></>
                            )}
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>{req.title}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell><Chip label={req.type || 'User Story'} size="small" sx={{ fontSize: '0.7rem', bgcolor: `${palette.blue}22`, color: palette.blue }} /></TableCell>
                        <TableCell><Chip label={req.state || '—'} size="small" sx={{ fontSize: '0.7rem', bgcolor: `${palette.green}22`, color: palette.green }} /></TableCell>
                        <TableCell align="right"><Typography variant="body2" sx={{ fontWeight: 700 }}>{req.tests}</Typography></TableCell>
                        <TableCell align="right"><Typography variant="body2" sx={{ color: palette.green, fontWeight: 600 }}>{req.passed}</Typography></TableCell>
                        <TableCell align="right"><Typography variant="body2" sx={{ color: req.failed > 0 ? palette.red : palette.overlay0, fontWeight: req.failed > 0 ? 600 : 400 }}>{req.failed}</Typography></TableCell>
                        <TableCell align="right"><Typography variant="body2" sx={{ color: req.blocked > 0 ? palette.yellow : palette.overlay0 }}>{req.blocked}</Typography></TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ flex: 1, height: 8, bgcolor: palette.surface1, borderRadius: 4, overflow: 'hidden' }}>
                              <Box sx={{ height: '100%', borderRadius: 4, bgcolor: barColor, width: `${req.coverage}%` }} />
                            </Box>
                            <Typography variant="caption" sx={{ color: barColor, fontWeight: 700, minWidth: 36 }}>{req.coverage}%</Typography>
                          </Box>
                        </TableCell>
                      </TableRow>

                      {/* Expandable TC pills row */}
                      <TableRow sx={{ '& td': { borderColor: palette.surface1 } }}>
                        <TableCell colSpan={10} sx={{ py: 0, bgcolor: `${palette.blue}08` }}>
                          <Collapse in={isOpen} timeout="auto" unmountOnExit>
                            <Box sx={{ py: 1.5, px: 2 }}>
                              <Typography variant="caption" sx={{ color: palette.subtext0, fontWeight: 600, mb: 1, display: 'block' }}>Tests associés :</Typography>
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                                {req.testCases.length === 0 ? (
                                  <Typography variant="caption" sx={{ color: palette.overlay0, fontStyle: 'italic' }}>Aucun test associé</Typography>
                                ) : req.testCases.map(tc => {
                                  const tcUrl = adoBaseUrl ? `${adoBaseUrl}/_workitems/edit/${tc.id}` : null
                                  return (
                                  <Chip
                                    key={tc.id}
                                    size="small"
                                    label={
                                      <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <Typography
                                          component="span"
                                          onClick={(e) => { e.stopPropagation(); if (tcUrl) openLink(tcUrl) }}
                                          sx={{ fontSize: '0.72rem', fontWeight: 700, color: palette.blue, cursor: tcUrl ? 'pointer' : 'default', '&:hover': tcUrl ? { textDecoration: 'underline' } : {} }}
                                        >#{tc.id}</Typography>
                                        <Typography component="span" sx={{ fontSize: '0.72rem' }}>{tc.name}</Typography>
                                        {tc.suiteName && <Typography component="span" sx={{ fontSize: '0.68rem', color: palette.overlay0, fontStyle: 'italic' }}>(Suite: {tc.suiteName})</Typography>}
                                      </Box>
                                    }
                                    sx={{
                                      height: 'auto', py: 0.5,
                                      bgcolor: `${outcomeColor(tc.outcome)}18`,
                                      border: `1px solid ${outcomeColor(tc.outcome)}44`,
                                      '& .MuiChip-label': { px: 1 },
                                    }}
                                  />
                                  )
                                })}
                              </Box>
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  )
                })}
              </TableBody>
            </Table>
          </>
        )}

        {/* Bugs table */}
        {bugMatrix.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <BugReport sx={{ color: palette.red, fontSize: 18 }} />
              <Typography variant="h5">Bugs Rattachés aux Tests ({bugMatrix.length})</Typography>
            </Box>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 700, color: palette.subtext0, fontSize: '0.75rem', borderColor: palette.surface1, bgcolor: palette.surface0 } }}>
                  <TableCell>Bug ID</TableCell>
                  <TableCell>Titre</TableCell>
                  <TableCell>Sévérité</TableCell>
                  <TableCell>Priorité</TableCell>
                  <TableCell>État</TableCell>
                  <TableCell>Assigné à</TableCell>
                  <TableCell>Test Associé</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {bugMatrix.map((bug) => (
                  <TableRow key={bug.id} hover sx={{ '& td': { borderColor: palette.surface1 } }}>
                    <TableCell>
                      <Typography
                        component="a"
                        onClick={() => openLink(bug.url)}
                        sx={{ color: palette.red, fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                      >
                        #{bug.id}
                      </Typography>
                    </TableCell>
                    <TableCell><Typography variant="body2">{bug.title}</Typography></TableCell>
                    <TableCell>
                      {bug.severity ? <Chip label={bug.severity} size="small" sx={{ fontSize: '0.7rem', bgcolor: `${palette.peach}25`, color: palette.peach }} /> : <Typography variant="caption" sx={{ color: palette.overlay0 }}>—</Typography>}
                    </TableCell>
                    <TableCell>
                      {bug.priority ? <Chip label={`P${bug.priority}`} size="small" sx={{ fontSize: '0.7rem', bgcolor: `${palette.yellow}25`, color: palette.yellow }} /> : <Typography variant="caption" sx={{ color: palette.overlay0 }}>—</Typography>}
                    </TableCell>
                    <TableCell><Chip label={bug.state || '—'} size="small" sx={{ fontSize: '0.7rem', bgcolor: `${palette.green}22`, color: palette.green }} /></TableCell>
                    <TableCell><Typography variant="body2" sx={{ color: palette.subtext0 }}>{bug.assignedTo || '—'}</Typography></TableCell>
                    <TableCell>
                      {bug.associatedTest
                        ? <Chip
                            label={bug.associatedTest.id
                              ? `#${bug.associatedTest.id}${bug.associatedTest.name ? ` ${bug.associatedTest.name}` : ''}`
                              : (bug.associatedTest.name || '—')}
                            size="small"
                            sx={{ fontSize: '0.7rem', bgcolor: `${palette.blue}22`, color: palette.blue, maxWidth: 220 }}
                          />
                        : <Typography variant="caption" sx={{ color: palette.overlay0 }}>—</Typography>
                      }
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}

        {/* Empty state */}
        {reqMatrix.length === 0 && bugMatrix.length === 0 && !error && (
          <Typography variant="body2" sx={{ color: palette.overlay0, fontStyle: 'italic', textAlign: 'center', py: 2 }}>
            Aucune exigence liée aux cas de test de ce plan.
          </Typography>
        )}
      </CardContent>
    </Card>
  )
}
