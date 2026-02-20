import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, CheckCircle2, XCircle, Ban, Clock, Layers,
  TrendingUp, ChevronDown, Loader2, AlertCircle,
  Filter, FolderOpen, Server, LogOut, Link, Bug,
  RefreshCw, BarChart2, FileText,
} from 'lucide-react'
import { useAdoStore } from '@store/adoStore'
import { useAuthStore } from '@store/authStore'
import { cn } from '../lib/utils'
import { Button } from '../components/ui/button'
import { RatePill } from '../components/ui/badge'
import { Progress } from '../components/ui/progress'
import { Table, TableHead, TableBody, TableRow, Th, Td } from '../components/ui/table'
import DonutChart from '../components/charts/DonutChart'
import HistoryChart from '../components/charts/HistoryChart'

export default function DashboardPage() {
  const navigate = useNavigate()
  const { activeConnection, disconnect } = useAuthStore()
  const {
    projects, selectedProject, testPlans, selectedPlan, fullPlanData,
    availableSuites, selectedSuiteIds, setSuiteFilter,
    isLoading, loadingStep, error,
    loadProjects, selectProject, selectPlan, extractFullPlanData,
  } = useAdoStore()

  const [traceExpanded, setTraceExpanded] = useState(false)
  const [suiteExpanded, setSuiteExpanded] = useState(true)

  useEffect(() => { if (projects.length === 0) loadProjects() }, [])

  const metrics      = fullPlanData?.metrics
  const history      = fullPlanData?.history || []
  const suiteMetrics = fullPlanData?.suiteMetrics || []
  const traceability = fullPlanData?.traceability || []

  const handleDisconnect = async () => {
    if (disconnect) await disconnect()
    navigate('/connect')
  }

  return (
    <div className="flex flex-col h-screen bg-crust overflow-hidden">

      {/* ── Topbar ─────────────────────────────────────────────────────── */}
      <header className="flex-none flex items-center justify-between px-5 h-12 border-b border-surface0 bg-mantle">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-blue to-mauve flex items-center justify-center text-crust font-bold text-[10px]">
            TFS
          </div>
          <span className="text-sm font-semibold text-text">TFS Reporter</span>
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded border border-mauve/30 text-mauve bg-mauve/10 tracking-wider">
            V2
          </span>
        </div>

        <div className="flex items-center gap-3">
          {activeConnection && (
            <div className="flex items-center gap-1.5 text-xs text-overlay1">
              <Server className="w-3 h-3" />
              <span className="text-subtext0 font-medium">{activeConnection.organisation || activeConnection.name}</span>
            </div>
          )}
          <Button variant="ghost" size="icon-sm" onClick={handleDisconnect} title="Déconnecter">
            <LogOut className="w-3.5 h-3.5" />
          </Button>
        </div>
      </header>

      {/* ── Main ───────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto p-5 space-y-4">

        {/* ── Sélecteurs ── */}
        <div className="card p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1 min-w-[200px]">
              <label className="label">Projet</label>
              <select
                value={selectedProject?.name || ''}
                onChange={(e) => { const p = projects.find(p => p.name === e.target.value); if (p) selectProject(p) }}
                disabled={isLoading || projects.length === 0}
                className="min-w-[200px]"
              >
                <option value="">— Sélectionner —</option>
                {projects.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1 min-w-[260px]">
              <label className="label">Plan de test</label>
              <select
                value={selectedPlan?.id || ''}
                onChange={(e) => { const p = testPlans.find(p => String(p.id) === e.target.value); if (p) selectPlan(p) }}
                disabled={isLoading || testPlans.length === 0}
                className="min-w-[260px]"
              >
                <option value="">— Sélectionner —</option>
                {testPlans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            {availableSuites.length > 0 && (
              <div className="flex flex-col gap-1">
                <label className="label">Périmètre</label>
                <SuiteFilter suites={availableSuites} selected={selectedSuiteIds} onChange={setSuiteFilter} />
              </div>
            )}

            <div className="ml-auto">
              <Button onClick={extractFullPlanData} disabled={isLoading || !selectedPlan}>
                {isLoading
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Analyse…</>
                  : <><RefreshCw className="w-3.5 h-3.5" />Analyser</>
                }
              </Button>
            </div>
          </div>

          {isLoading && (
            <div className="mt-3 pt-3 border-t border-surface0 space-y-1.5">
              <div className="flex items-center gap-2 text-xs text-subtext0">
                <Loader2 className="w-3 h-3 animate-spin text-blue" />
                {loadingStep || 'Chargement…'}
              </div>
              <div className="h-0.5 rounded-full bg-surface0 overflow-hidden">
                <div className="h-full bg-blue animate-pulse rounded-full w-2/3" />
              </div>
            </div>
          )}
        </div>

        {/* ── Erreur ── */}
        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-red/20 bg-red/5 p-4 text-sm text-red">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {metrics ? (
          <>
            {/* ── En-tête du plan ── */}
            <div className="card p-4">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <h1 className="text-base font-semibold text-text">
                    {fullPlanData.plan?.name || selectedPlan?.name}
                  </h1>
                  {fullPlanData.filteredSuiteIds?.length > 0 && (
                    <p className="text-xs text-overlay1 mt-0.5">
                      Périmètre restreint à {fullPlanData.filteredSuiteIds.length} suite{fullPlanData.filteredSuiteIds.length > 1 ? 's' : ''}
                    </p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <div className={cn(
                    'text-3xl font-bold font-mono',
                    metrics.passRate >= 80 ? 'text-green' : metrics.passRate >= 50 ? 'text-yellow' : 'text-red'
                  )}>
                    {metrics.passRate}%
                  </div>
                  <div className="text-xs text-overlay1">taux de réussite</div>
                </div>
              </div>
              <Progress value={metrics.passRate} className="h-2" />
            </div>

            {/* ── KPIs ── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <KpiCard label="Total"        value={metrics.total}       icon={Layers}      color="#89b4fa" />
              <KpiCard label="Réussis"      value={metrics.passed}      icon={CheckCircle2} color="#a6e3a1" subtext={`${metrics.passRate}%`} />
              <KpiCard label="Échoués"      value={metrics.failed}      icon={XCircle}     color="#f38ba8" />
              <KpiCard label="Bloqués"      value={metrics.blocked}     icon={Ban}         color="#f9e2af" />
              <KpiCard label="Non exécutés" value={metrics.notExecuted} icon={Clock}       color="#6c7086" />
              <KpiCard label="Bugs" value={fullPlanData.bugDetails?.length ?? 0} icon={Bug} color="#fab387" />
            </div>

            {/* ── Graphiques ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="card p-4">
                <div className="label mb-3">Répartition des résultats</div>
                <DonutChart metrics={metrics} />
              </div>

              {history.length > 1 ? (
                <div className="card p-4 md:col-span-2">
                  <div className="flex items-center gap-2 label mb-3">
                    <TrendingUp className="w-3.5 h-3.5 text-blue" />
                    Historique des exécutions
                  </div>
                  <HistoryChart history={history} />
                </div>
              ) : (
                <div className="card p-4 md:col-span-2 flex items-center justify-center min-h-[160px]">
                  <div className="text-center text-overlay0">
                    <BarChart2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Historique insuffisant</p>
                    <p className="text-xs mt-0.5 opacity-70">Au moins 2 exécutions nécessaires</p>
                  </div>
                </div>
              )}
            </div>

            {/* ── Suites ── */}
            {suiteMetrics.length > 0 && (
              <div className="card overflow-hidden">
                <button
                  className="w-full flex items-center justify-between px-5 py-3 hover:bg-surface0/25 transition-colors text-left"
                  onClick={() => setSuiteExpanded(v => !v)}
                >
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-blue" />
                    <span className="font-semibold text-sm text-text">Résultats par suite</span>
                    <span className="text-xs text-overlay1">({suiteMetrics.length})</span>
                  </div>
                  <ChevronDown className={cn('w-4 h-4 text-overlay0 transition-transform duration-150', suiteExpanded && 'rotate-180')} />
                </button>

                {suiteExpanded && (
                  <div className="border-t border-surface0">
                    <Table>
                      <TableHead>
                        <tr>
                          <Th>Suite</Th>
                          <Th className="text-center w-20">Total</Th>
                          <Th className="text-center w-24">Réussis</Th>
                          <Th className="text-center w-24">Échoués</Th>
                          <Th className="text-center w-24">Bloqués</Th>
                          <Th className="text-center w-28">Taux</Th>
                        </tr>
                      </TableHead>
                      <TableBody>
                        {suiteMetrics.map(sm => (
                          <TableRow key={sm.suiteId}>
                            <Td className="font-medium text-text">{sm.suiteName || `Suite ${sm.suiteId}`}</Td>
                            <Td className="text-center text-subtext0 font-mono">{sm.total}</Td>
                            <Td className="text-center font-mono text-green">{sm.passed}</Td>
                            <Td className="text-center font-mono" style={{ color: sm.failed  > 0 ? '#f38ba8' : '#6c7086' }}>{sm.failed}</Td>
                            <Td className="text-center font-mono" style={{ color: sm.blocked > 0 ? '#f9e2af' : '#6c7086' }}>{sm.blocked}</Td>
                            <Td className="text-center"><RatePill value={sm.passRate} /></Td>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )}

            {/* ── Traçabilité ── */}
            {(traceability.length > 0 || fullPlanData.traceabilityError) && (
              <div className="card overflow-hidden">
                <button
                  className="w-full flex items-center justify-between px-5 py-3 hover:bg-surface0/25 transition-colors text-left"
                  onClick={() => setTraceExpanded(v => !v)}
                >
                  <div className="flex items-center gap-2">
                    <Link className="w-4 h-4 text-mauve" />
                    <span className="font-semibold text-sm text-text">Traçabilité</span>
                    {traceability.length > 0 && (
                      <span className="text-xs text-overlay1">({traceability.length} cas)</span>
                    )}
                  </div>
                  <ChevronDown className={cn('w-4 h-4 text-overlay0 transition-transform duration-150', traceExpanded && 'rotate-180')} />
                </button>

                {traceExpanded && (
                  <div className="border-t border-surface0">
                    {fullPlanData.traceabilityError && (
                      <div className="p-4 text-sm text-yellow/80 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        {fullPlanData.traceabilityError}
                      </div>
                    )}
                    {traceability.length > 0 && (
                      <Table>
                        <TableHead>
                          <tr>
                            <Th>Cas de test</Th>
                            <Th>Exigences</Th>
                            <Th>Hiérarchie</Th>
                          </tr>
                        </TableHead>
                        <TableBody>
                          {traceability.map((tc, i) => (
                            <TableRow key={i}>
                              <Td className="font-medium text-text max-w-[220px] truncate" title={tc.testCaseName}>
                                {tc.testCaseName}
                              </Td>
                              <Td>
                                <div className="flex flex-wrap gap-1.5">
                                  {(tc.requirements || []).map((req, j) => (
                                    <a key={j} href={req.url} target="_blank" rel="noreferrer"
                                      className="text-xs text-blue hover:underline" title={req.title}>
                                      #{req.id}
                                    </a>
                                  ))}
                                  {(!tc.requirements || tc.requirements.length === 0) && (
                                    <span className="text-xs text-overlay0">—</span>
                                  )}
                                </div>
                              </Td>
                              <Td className="text-xs text-subtext0 max-w-[260px] truncate">
                                {tc.hierarchy?.join(' › ') || '—'}
                              </Td>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── CTA ── */}
            <div className="flex items-center gap-3 pt-1 pb-6">
              <Button disabled title="Disponible dans V1">
                <FileText className="w-3.5 h-3.5" />
                Générer le rapport
              </Button>
              <span className="text-xs text-overlay0">La génération de rapports est disponible dans l'interface V1</span>
            </div>
          </>
        ) : (
          !isLoading && (
            <div className="flex flex-col items-center justify-center py-20 text-overlay0">
              <FolderOpen className="w-14 h-14 mb-4 opacity-25" />
              <p className="text-base font-medium mb-1 text-subtext0">Sélectionnez un plan de test</p>
              <p className="text-sm">Choisissez un projet et un plan, puis cliquez sur Analyser</p>
            </div>
          )
        )}
      </main>
    </div>
  )
}

// ── KpiCard ───────────────────────────────────────────────────────────────
function KpiCard({ label, value, icon: Icon, color, subtext }) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="label">{label}</span>
        <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: color + '18' }}>
          <Icon className="w-3.5 h-3.5" style={{ color }} />
        </div>
      </div>
      <div className="text-2xl font-bold font-mono" style={{ color }}>{value ?? '—'}</div>
      {subtext && <div className="text-xs text-overlay0 mt-1">{subtext}</div>}
    </div>
  )
}

// ── SuiteFilter ───────────────────────────────────────────────────────────
function SuiteFilter({ suites, selected, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const label = selected.length > 0
    ? `${selected.length} suite${selected.length > 1 ? 's' : ''}`
    : 'Toutes les suites'

  const toggle = (id) =>
    onChange(selected.includes(id) ? selected.filter(s => s !== id) : [...selected, id])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 h-9 px-3 rounded-lg border border-surface0 bg-mantle text-sm text-text hover:border-surface2 transition-colors focus:outline-none focus:border-blue"
      >
        <Filter className="w-3.5 h-3.5 text-overlay1" />
        <span>{label}</span>
        <ChevronDown className={cn('w-3.5 h-3.5 text-overlay1 transition-transform duration-150', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute top-full mt-1.5 left-0 z-50 w-72 rounded-xl border border-surface0 bg-base shadow-2xl animate-fade-in">
          <div className="px-3 py-2 border-b border-surface0">
            <span className="label">Filtrer par suite</span>
          </div>
          <div className="max-h-60 overflow-y-auto p-1.5 space-y-0.5">
            {suites.map(suite => (
              <label
                key={suite.id}
                className="flex items-center gap-3 px-2.5 py-2 rounded-lg hover:bg-surface0 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  className="w-3.5 h-3.5 accent-blue"
                  checked={selected.includes(suite.id)}
                  onChange={() => toggle(suite.id)}
                />
                <span className="text-sm text-text truncate">{suite.name}</span>
              </label>
            ))}
          </div>
          {selected.length > 0 && (
            <div className="p-2 border-t border-surface0">
              <button
                onClick={() => { onChange([]); setOpen(false) }}
                className="w-full text-xs text-overlay1 hover:text-text py-1 transition-colors"
              >
                Effacer le filtre
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
