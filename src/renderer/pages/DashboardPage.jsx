import React, { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box, Typography, Card, CardContent, Grid,
  Button, LinearProgress, Alert, CircularProgress,
  Select, MenuItem, FormControl, InputLabel, Table,
  TableBody, TableCell, TableHead, TableRow, Chip,
} from '@mui/material'
import {
  Add, FolderOpen, Assessment, CheckCircle, Cancel, Block,
  HourglassEmpty, Warning, TrendingUp,
} from '@mui/icons-material'
import { useAdoStore } from '../store/adoStore'
import { useAuthStore } from '../store/authStore'
import { palette } from '../theme/theme'

export default function DashboardPage() {
  const navigate = useNavigate()
  const { activeConnection } = useAuthStore()
  const {
    projects, selectedProject, testPlans, selectedPlan, fullPlanData,
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
              <Box sx={{ display: 'flex', gap: 3, mt: 2, flexWrap: 'wrap' }}>
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

// ─── Donut Chart (canvas natif) ────────────────────────────────────────────
function DonutChart({ metrics }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const W = canvas.width, H = canvas.height
    const cx = W / 2, cy = H / 2, r = Math.min(W, H) * 0.38, ri = r * 0.6

    const segments = [
      { value: metrics.passed, color: '#a6e3a1', label: 'Réussis' },
      { value: metrics.failed, color: '#f38ba8', label: 'Échoués' },
      { value: metrics.blocked, color: '#f9e2af', label: 'Bloqués' },
      { value: metrics.notExecuted, color: '#6c7086', label: 'Non exécutés' },
    ].filter(s => s.value > 0)

    const total = segments.reduce((a, s) => a + s.value, 0)
    if (total === 0) return

    ctx.clearRect(0, 0, W, H)
    let angle = -Math.PI / 2

    segments.forEach(seg => {
      const sweep = (seg.value / total) * 2 * Math.PI
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.arc(cx, cy, r, angle, angle + sweep)
      ctx.closePath()
      ctx.fillStyle = seg.color
      ctx.fill()
      angle += sweep
    })

    // Trou donut
    ctx.beginPath()
    ctx.arc(cx, cy, ri, 0, 2 * Math.PI)
    ctx.fillStyle = '#1e1e2e'
    ctx.fill()

    // Texte centre
    ctx.fillStyle = '#cdd6f4'
    ctx.font = 'bold 22px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(metrics.passRate + '%', cx, cy - 8)
    ctx.font = '11px sans-serif'
    ctx.fillStyle = '#a6adc8'
    ctx.fillText('réussite', cx, cy + 14)

    // Légende
    let legendY = H * 0.82
    segments.forEach(seg => {
      ctx.fillStyle = seg.color
      ctx.fillRect(12, legendY - 6, 10, 10)
      ctx.fillStyle = '#a6adc8'
      ctx.font = '10px sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText(`${seg.label}: ${seg.value}`, 28, legendY + 2)
      legendY += 16
    })
  }, [metrics])

  return <canvas ref={canvasRef} width={260} height={220} style={{ width: '100%', maxWidth: 260, display: 'block', margin: '0 auto' }} />
}

// ─── History Chart (canvas natif) ─────────────────────────────────────────
function HistoryChart({ history }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || history.length < 2) return
    const ctx = canvas.getContext('2d')
    const W = canvas.width, H = canvas.height
    const pad = { top: 20, right: 20, bottom: 40, left: 40 }
    const chartW = W - pad.left - pad.right
    const chartH = H - pad.top - pad.bottom

    ctx.clearRect(0, 0, W, H)

    // Grille horizontale
    ctx.strokeStyle = '#313244'
    ctx.lineWidth = 1
    ;[0, 25, 50, 75, 100].forEach(pct => {
      const y = pad.top + chartH - (pct / 100) * chartH
      ctx.beginPath()
      ctx.moveTo(pad.left, y)
      ctx.lineTo(pad.left + chartW, y)
      ctx.stroke()
      ctx.fillStyle = '#6c7086'
      ctx.font = '9px sans-serif'
      ctx.textAlign = 'right'
      ctx.fillText(pct + '%', pad.left - 4, y + 3)
    })

    // Ligne seuil 80%
    const y80 = pad.top + chartH - (80 / 100) * chartH
    ctx.strokeStyle = '#f9e2af44'
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.moveTo(pad.left, y80)
    ctx.lineTo(pad.left + chartW, y80)
    ctx.stroke()
    ctx.setLineDash([])

    // Courbe taux de réussite
    const step = chartW / (history.length - 1)
    const points = history.map((h, i) => ({
      x: pad.left + i * step,
      y: pad.top + chartH - (h.passRate / 100) * chartH,
      rate: h.passRate,
      name: h.runName,
    }))

    // Zone remplie sous la courbe
    ctx.beginPath()
    ctx.moveTo(points[0].x, pad.top + chartH)
    points.forEach(p => ctx.lineTo(p.x, p.y))
    ctx.lineTo(points[points.length - 1].x, pad.top + chartH)
    ctx.closePath()
    const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + chartH)
    grad.addColorStop(0, '#89b4fa44')
    grad.addColorStop(1, '#89b4fa00')
    ctx.fillStyle = grad
    ctx.fill()

    // Ligne principale
    ctx.beginPath()
    ctx.strokeStyle = '#89b4fa'
    ctx.lineWidth = 2.5
    points.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y))
    ctx.stroke()

    // Points
    points.forEach(p => {
      const color = p.rate >= 80 ? '#a6e3a1' : p.rate >= 50 ? '#f9e2af' : '#f38ba8'
      ctx.beginPath()
      ctx.arc(p.x, p.y, 5, 0, 2 * Math.PI)
      ctx.fillStyle = color
      ctx.fill()
      ctx.strokeStyle = '#1e1e2e'
      ctx.lineWidth = 1.5
      ctx.stroke()

      // Label
      ctx.fillStyle = '#cdd6f4'
      ctx.font = 'bold 10px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(p.rate + '%', p.x, p.y - 10)
    })

    // Labels axe X
    ctx.fillStyle = '#6c7086'
    ctx.font = '9px sans-serif'
    ctx.textAlign = 'center'
    points.forEach((p, i) => {
      if (history.length <= 6 || i % 2 === 0) {
        const label = history[i].date ? new Date(history[i].date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) : `R${i + 1}`
        ctx.fillText(label, p.x, H - 8)
      }
    })
  }, [history])

  return <canvas ref={canvasRef} width={480} height={200} style={{ width: '100%', display: 'block' }} />
}
