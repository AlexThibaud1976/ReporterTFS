import React, { useState, useEffect, useRef } from 'react'
import {
  Box, Typography, Card, CardContent, Grid, Button,
  FormControl, InputLabel, Select, MenuItem, CircularProgress,
  Alert, LinearProgress, Chip, Divider, Table, TableBody,
  TableCell, TableHead, TableRow, Tooltip,
} from '@mui/material'
import {
  CompareArrows, TrendingUp, TrendingDown, TrendingFlat,
  CheckCircle, Cancel, Warning, Block, HourglassEmpty,
} from '@mui/icons-material'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, Title, Legend,
  Tooltip as ChartTooltip, RadialLinearScale, PointElement, LineElement,
} from 'chart.js'
import { Bar, Radar } from 'react-chartjs-2'
import { adoApi } from '../api/ipcApi'
import { useAdoStore } from '../store/adoStore'
import { palette } from '../theme/theme'

ChartJS.register(
  CategoryScale, LinearScale, BarElement, Title, Legend,
  ChartTooltip, RadialLinearScale, PointElement, LineElement
)

// ─── Sélecteur d'un plan ──────────────────────────────────────────────────

function PlanSelector({ label, projects, value, onChange, loading }) {
  const [project, setProject] = useState('')
  const [plans, setPlans] = useState([])
  const [loadingPlans, setLoadingPlans] = useState(false)

  const handleProjectChange = async (projectName) => {
    setProject(projectName)
    setPlans([])
    onChange(null)
    if (!projectName) return
    setLoadingPlans(true)
    try {
      const data = await adoApi.getTestPlans(projectName)
      setPlans(data)
    } finally {
      setLoadingPlans(false)
    }
  }

  return (
    <Card variant="outlined" sx={{ borderColor: palette.surface1, height: '100%' }}>
      <CardContent>
        <Typography variant="h5" sx={{ mb: 2, color: palette.blue }}>{label}</Typography>
        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
          <InputLabel>Projet</InputLabel>
          <Select
            value={project} label="Projet"
            onChange={(e) => handleProjectChange(e.target.value)}
            disabled={loading || projects.length === 0}
          >
            {projects.map((p) => (
              <MenuItem key={p.id} value={p.name}>{p.name}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth size="small">
          <InputLabel>Plan de test</InputLabel>
          <Select
            value={value?.id || ''} label="Plan de test"
            onChange={(e) => {
              const plan = plans.find((p) => p.id === e.target.value)
              if (plan) onChange({ ...plan, _project: project })
            }}
            disabled={loadingPlans || plans.length === 0}
          >
            {plans.map((p) => (
              <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
            ))}
          </Select>
        </FormControl>

        {loadingPlans && (
          <Box sx={{ mt: 1 }}>
            <LinearProgress />
            <Typography variant="caption" sx={{ color: palette.overlay0 }}>Chargement des plans…</Typography>
          </Box>
        )}

        {value && (
          <Box sx={{ mt: 2, p: 1.5, bgcolor: `${palette.blue}15`, borderRadius: 1 }}>
            <Typography variant="body2" sx={{ color: palette.blue, fontWeight: 600 }}>{value.name}</Typography>
            {value.state && (
              <Typography variant="caption" sx={{ color: palette.overlay0 }}>État : {value.state}</Typography>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Badge tendance ───────────────────────────────────────────────────────

function TrendBadge({ delta }) {
  if (delta > 0) return (
    <Chip icon={<TrendingUp />} label={`+${delta}%`} size="small"
      sx={{ bgcolor: `${palette.green}25`, color: palette.green, fontWeight: 700 }} />
  )
  if (delta < 0) return (
    <Chip icon={<TrendingDown />} label={`${delta}%`} size="small"
      sx={{ bgcolor: `${palette.red}25`, color: palette.red, fontWeight: 700 }} />
  )
  return (
    <Chip icon={<TrendingFlat />} label="=" size="small"
      sx={{ bgcolor: `${palette.overlay0}25`, color: palette.overlay0 }} />
  )
}

// ─── Page principale ──────────────────────────────────────────────────────

export default function ComparisonPage() {
  const { projects, loadProjects } = useAdoStore()

  const [planA, setPlanA] = useState(null)
  const [planB, setPlanB] = useState(null)
  const [dataA, setDataA] = useState(null)
  const [dataB, setDataB] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => { if (projects.length === 0) loadProjects() }, [])

  const handleCompare = async () => {
    if (!planA || !planB) return
    setLoading(true)
    setError(null)
    setDataA(null)
    setDataB(null)
    try {
      const [resA, resB] = await Promise.all([
        adoApi.getFullPlanData(planA._project, planA.id),
        adoApi.getFullPlanData(planB._project, planB.id),
      ])
      setDataA(resA)
      setDataB(resB)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const ready = dataA && dataB
  const mA = dataA?.metrics
  const mB = dataB?.metrics
  const deltaPass = ready ? (mB.passRate - mA.passRate) : 0

  // ─── Données graphiques ─────────────────────────────────────────────────

  const barData = ready ? {
    labels: ['Réussis', 'Échoués', 'Bloqués', 'Non exécutés'],
    datasets: [
      {
        label: dataA.plan?.name || 'Plan A',
        data: [mA.passed, mA.failed, mA.blocked, mA.notExecuted],
        backgroundColor: `${palette.blue}CC`,
        borderRadius: 4,
      },
      {
        label: dataB.plan?.name || 'Plan B',
        data: [mB.passed, mB.failed, mB.blocked, mB.notExecuted],
        backgroundColor: `${palette.mauve}CC`,
        borderRadius: 4,
      },
    ],
  } : null

  const radarData = ready ? {
    labels: ['Taux réussite', 'Couverture', 'Exécution', 'Qualité globale'],
    datasets: [
      {
        label: dataA.plan?.name || 'Plan A',
        data: [
          mA.passRate,
          mA.total > 0 ? Math.round(((mA.total - mA.notExecuted) / mA.total) * 100) : 0,
          mA.total > 0 ? Math.round(((mA.passed + mA.failed) / mA.total) * 100) : 0,
          mA.passRate >= 80 ? 100 : mA.passRate,
        ],
        backgroundColor: `${palette.blue}30`,
        borderColor: palette.blue,
        pointBackgroundColor: palette.blue,
      },
      {
        label: dataB.plan?.name || 'Plan B',
        data: [
          mB.passRate,
          mB.total > 0 ? Math.round(((mB.total - mB.notExecuted) / mB.total) * 100) : 0,
          mB.total > 0 ? Math.round(((mB.passed + mB.failed) / mB.total) * 100) : 0,
          mB.passRate >= 80 ? 100 : mB.passRate,
        ],
        backgroundColor: `${palette.mauve}30`,
        borderColor: palette.mauve,
        pointBackgroundColor: palette.mauve,
      },
    ],
  } : null

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: palette.text } },
    },
    scales: {
      x: { ticks: { color: palette.subtext0 }, grid: { color: `${palette.surface1}80` } },
      y: { ticks: { color: palette.subtext0 }, grid: { color: `${palette.surface1}80` } },
    },
  }

  const radarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { labels: { color: palette.text } } },
    scales: {
      r: {
        min: 0, max: 100,
        ticks: { color: palette.subtext0, backdropColor: 'transparent', stepSize: 20 },
        grid: { color: `${palette.surface1}80` },
        pointLabels: { color: palette.subtext0, font: { size: 11 } },
      },
    },
  }

  // ─── Comparaison par suite ──────────────────────────────────────────────

  const suiteComparison = ready ? (() => {
    const mapA = Object.fromEntries((dataA.suiteMetrics || []).map((s) => [s.suiteName, s]))
    const mapB = Object.fromEntries((dataB.suiteMetrics || []).map((s) => [s.suiteName, s]))
    const allNames = [...new Set([
      ...(dataA.suiteMetrics || []).map((s) => s.suiteName),
      ...(dataB.suiteMetrics || []).map((s) => s.suiteName),
    ])]
    return allNames.map((name) => ({
      name,
      a: mapA[name] || null,
      b: mapB[name] || null,
    }))
  })() : []

  // ─── Rendu ───────────────────────────────────────────────────────────────

  return (
    <Box sx={{ p: 3, height: '100%', overflow: 'auto' }}>

      {/* En-tête */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h2">Comparaison de plans</Typography>
        <Typography variant="body2" sx={{ color: palette.overlay0, mt: 0.5 }}>
          Comparez deux plans de test pour mesurer la progression ou régression de qualité
        </Typography>
      </Box>

      {/* Sélecteurs */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={5}>
          <PlanSelector label="Plan A (référence)" projects={projects} value={planA} onChange={setPlanA} loading={loading} />
        </Grid>

        <Grid item xs={12} md={2} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Box sx={{ textAlign: 'center' }}>
            <CompareArrows sx={{ fontSize: 40, color: palette.overlay0, mb: 1 }} />
            <Button
              variant="contained"
              onClick={handleCompare}
              disabled={!planA || !planB || loading}
              startIcon={loading ? <CircularProgress size={16} /> : <CompareArrows />}
              fullWidth
            >
              {loading ? 'Analyse…' : 'Comparer'}
            </Button>
          </Box>
        </Grid>

        <Grid item xs={12} md={5}>
          <PlanSelector label="Plan B (comparaison)" projects={projects} value={planB} onChange={setPlanB} loading={loading} />
        </Grid>
      </Grid>

      {/* Chargement */}
      {loading && (
        <Box sx={{ mb: 3 }}>
          <LinearProgress />
          <Typography variant="caption" sx={{ color: palette.overlay0 }}>
            Extraction des données des deux plans…
          </Typography>
        </Box>
      )}

      {/* Erreur */}
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {/* Résultats */}
      {ready && (
        <>
          {/* KPI globaux */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {[
              {
                label: 'Taux de réussite',
                valA: `${mA.passRate}%`,
                valB: `${mB.passRate}%`,
                delta: deltaPass,
                icon: deltaPass >= 0 ? <CheckCircle sx={{ color: palette.green }} /> : <Warning sx={{ color: palette.red }} />,
              },
              {
                label: 'Tests réussis',
                valA: mA.passed,
                valB: mB.passed,
                delta: mB.passed - mA.passed,
                icon: <CheckCircle sx={{ color: palette.green }} />,
              },
              {
                label: 'Tests échoués',
                valA: mA.failed,
                valB: mB.failed,
                delta: mB.failed - mA.failed,
                invert: true,
                icon: <Cancel sx={{ color: palette.red }} />,
              },
              {
                label: 'Total tests',
                valA: mA.total,
                valB: mB.total,
                delta: mB.total - mA.total,
                icon: <HourglassEmpty sx={{ color: palette.blue }} />,
              },
            ].map(({ label, valA, valB, delta, invert, icon }) => (
              <Grid item xs={12} sm={6} md={3} key={label}>
                <Card sx={{ height: '100%' }}>
                  <CardContent sx={{ pb: '12px !important' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                      {icon}
                      <Typography variant="caption" sx={{ color: palette.overlay0, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
                        {label}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="caption" sx={{ color: palette.overlay0 }}>Plan A</Typography>
                        <Typography variant="h4" sx={{ color: palette.blue }}>{valA}</Typography>
                      </Box>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="caption" sx={{ color: palette.overlay0 }}>Plan B</Typography>
                        <Typography variant="h4" sx={{ color: palette.mauve }}>{valB}</Typography>
                      </Box>
                    </Box>
                    {typeof delta === 'number' && (
                      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                        <TrendBadge delta={invert ? -delta : delta} />
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Alerte qualité */}
          {mA.alertTriggered && mB.alertTriggered && (
            <Alert severity="error" icon={<Warning />} sx={{ mb: 3 }}>
              ⚠️ Les deux plans ont un taux de réussite inférieur à 80% — Action urgente requise !
            </Alert>
          )}
          {mA.alertTriggered && !mB.alertTriggered && (
            <Alert severity="success" icon={<TrendingUp />} sx={{ mb: 3 }}>
              ✅ Le plan B a dépassé le seuil de qualité de 80% (le plan A était en dessous).
            </Alert>
          )}
          {!mA.alertTriggered && mB.alertTriggered && (
            <Alert severity="warning" icon={<TrendingDown />} sx={{ mb: 3 }}>
              ⚠️ Régression de qualité : le plan B est passé sous le seuil de 80%.
            </Alert>
          )}

          {/* Graphiques */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={7}>
              <Card>
                <CardContent>
                  <Typography variant="h5" sx={{ mb: 2 }}>Résultats comparés</Typography>
                  <Box sx={{ height: 280 }}>
                    <Bar data={barData} options={chartOptions} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={5}>
              <Card>
                <CardContent>
                  <Typography variant="h5" sx={{ mb: 2 }}>Radar qualité</Typography>
                  <Box sx={{ height: 280 }}>
                    <Radar data={radarData} options={radarOptions} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Comparaison par suite */}
          {suiteComparison.length > 0 && (
            <Card>
              <CardContent>
                <Typography variant="h5" sx={{ mb: 2 }}>Comparaison par suite de tests</Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ color: palette.subtext0, fontWeight: 700 }}>Suite</TableCell>
                      <TableCell align="center" sx={{ color: palette.blue, fontWeight: 700 }}>Réussite A</TableCell>
                      <TableCell align="center" sx={{ color: palette.mauve, fontWeight: 700 }}>Réussite B</TableCell>
                      <TableCell align="center" sx={{ color: palette.overlay0, fontWeight: 700 }}>Évolution</TableCell>
                      <TableCell align="center" sx={{ color: palette.overlay0, fontWeight: 700 }}>Total A → B</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {suiteComparison.map(({ name, a, b }) => {
                      const rateA = a?.passRate ?? null
                      const rateB = b?.passRate ?? null
                      const delta = rateA !== null && rateB !== null ? rateB - rateA : null

                      return (
                        <TableRow key={name} hover>
                          <TableCell>
                            <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>{name}</Typography>
                          </TableCell>
                          <TableCell align="center">
                            {rateA !== null ? (
                              <Chip label={`${rateA}%`} size="small"
                                sx={{ bgcolor: rateA >= 80 ? `${palette.green}25` : `${palette.red}25`, color: rateA >= 80 ? palette.green : palette.red }} />
                            ) : <Typography variant="caption" sx={{ color: palette.overlay0 }}>—</Typography>}
                          </TableCell>
                          <TableCell align="center">
                            {rateB !== null ? (
                              <Chip label={`${rateB}%`} size="small"
                                sx={{ bgcolor: rateB >= 80 ? `${palette.green}25` : `${palette.red}25`, color: rateB >= 80 ? palette.green : palette.red }} />
                            ) : <Typography variant="caption" sx={{ color: palette.overlay0 }}>—</Typography>}
                          </TableCell>
                          <TableCell align="center">
                            {delta !== null ? <TrendBadge delta={delta} /> : '—'}
                          </TableCell>
                          <TableCell align="center">
                            <Typography variant="caption" sx={{ color: palette.overlay0 }}>
                              {a ? a.total : '—'} → {b ? b.total : '—'}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* État initial */}
      {!ready && !loading && !error && (
        <Box sx={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          py: 8, opacity: 0.5,
        }}>
          <CompareArrows sx={{ fontSize: 64, color: palette.overlay0, mb: 2 }} />
          <Typography variant="h5" sx={{ color: palette.overlay0 }}>
            Sélectionnez deux plans de test puis cliquez sur "Comparer"
          </Typography>
        </Box>
      )}
    </Box>
  )
}
