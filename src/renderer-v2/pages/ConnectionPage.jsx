import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Server, Eye, EyeOff, Loader2, CheckCircle2, WifiOff, Trash2, ArrowRight, Plus, X } from 'lucide-react'
import { useAuthStore } from '@store/authStore'
import { authApi } from '@api/ipcApi'
import { Button } from '../components/ui/button'
import { cn } from '../lib/utils'

const API_VERSIONS = [
  { value: '5.0', label: '5.0 — Recommandé (Test Plans)' },
  { value: '6.0', label: '6.0 — ADO Server 2019+' },
  { value: '7.0', label: '7.0 — ADO Server 2022' },
]

const DEFAULT_FORM = { organisation: '', pat: '', apiVersion: '5.0' }

export default function ConnectionPage() {
  const navigate = useNavigate()
  const { connections, isConnected, isLoading, error, loadConnections, connectAndSave, switchConnection, deleteConnection, clearError } = useAuthStore()

  const [form,       setForm]       = useState(DEFAULT_FORM)
  const [showPat,    setShowPat]    = useState(false)
  const [showForm,   setShowForm]   = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [isTesting,  setIsTesting]  = useState(false)

  useEffect(() => { loadConnections() }, [])
  useEffect(() => { if (isConnected) navigate('/dashboard') }, [isConnected])

  const handleChange = (field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }))
    setTestResult(null)
    if (error) clearError?.()
  }

  const handleTest = async () => {
    setIsTesting(true)
    const r = await authApi.testConnection({ organisation: form.organisation, pat: form.pat, apiVersion: form.apiVersion })
    setTestResult(r)
    setIsTesting(false)
  }

  const handleConnect = async () => {
    const result = await connectAndSave({ name: form.organisation, organisation: form.organisation, pat: form.pat, apiVersion: form.apiVersion })
    if (result.success) setTestResult({ success: true, message: result.message })
    else setTestResult({ success: false, message: result.message })
  }

  const hasConnections = connections.length > 0

  return (
    <div className="min-h-screen bg-crust flex items-center justify-center p-6">
      <div className="w-full max-w-[820px] flex gap-6 items-start">

        {/* ── Branding ── */}
        <div className="hidden md:flex flex-col flex-1 pt-2 pr-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue to-mauve flex items-center justify-center text-crust font-black text-sm mb-5">
            TFS
          </div>
          <h1 className="text-2xl font-bold text-text mb-2 leading-tight">TFS Reporter <span className="text-mauve">V2</span></h1>
          <p className="text-sm text-subtext0 mb-6 leading-relaxed">
            Visualisez vos résultats de test Azure DevOps avec une interface repensée.
          </p>
          <ul className="space-y-2.5">
            {[
              'Dashboard interactif',
              'Graphiques adaptatifs',
              'Traçabilité & bugs intégrés',
              'Connexion sécurisée PAT chiffré',
            ].map(f => (
              <li key={f} className="flex items-center gap-2.5 text-sm text-subtext0">
                <CheckCircle2 className="w-4 h-4 text-green shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* ── Card ── */}
        <div className="card flex-1 max-w-md overflow-hidden">

          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-surface0">
            <div className="w-7 h-7 rounded-lg bg-blue/10 flex items-center justify-center">
              <Server className="w-4 h-4 text-blue" />
            </div>
            <div>
              <div className="text-sm font-semibold text-text">Connexion Azure DevOps</div>
              <div className="text-xs text-overlay0">Configurez l'accès à votre instance ADO</div>
            </div>
          </div>

          <div className="p-5">

            {/* ── Liste des connexions ── */}
            {hasConnections && !showForm ? (
              <div className="space-y-3">
                <div className="label mb-2">Connexions sauvegardées</div>
                <div className="space-y-1.5">
                  {connections.map(conn => (
                    <div key={conn.name} className="group flex items-center gap-3 rounded-lg border border-surface0 hover:border-surface1 bg-mantle hover:bg-surface0/40 transition-all cursor-pointer px-3 py-2.5">
                      <div
                        className="flex-1 min-w-0"
                        onClick={() => switchConnection(conn.name)}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-text truncate">{conn.organisation}</span>
                          <span className="text-[10px] text-overlay0 shrink-0">v{conn.apiVersion || '5.0'}</span>
                        </div>
                        {conn.project && (
                          <div className="text-xs text-overlay1 mt-0.5">{conn.project}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteConnection(conn.name) }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red/10 text-overlay0 hover:text-red"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => switchConnection(conn.name)}
                          disabled={isLoading}
                          className="p-1 rounded text-overlay0 hover:text-blue transition-colors"
                        >
                          {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <Button
                  variant="outline"
                  className="w-full mt-2"
                  size="sm"
                  onClick={() => { setShowForm(true); setForm(DEFAULT_FORM); setTestResult(null) }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Nouvelle connexion
                </Button>
              </div>

            ) : (
              /* ── Formulaire ── */
              <div className="space-y-4">
                {hasConnections && (
                  <button
                    onClick={() => { setShowForm(false); setTestResult(null) }}
                    className="flex items-center gap-1.5 text-xs text-overlay1 hover:text-text transition-colors mb-1"
                  >
                    <X className="w-3.5 h-3.5" /> Retour aux connexions
                  </button>
                )}

                {/* Organisation */}
                <div className="space-y-1">
                  <label className="label">Organisation Azure DevOps *</label>
                  <input
                    value={form.organisation}
                    onChange={handleChange('organisation')}
                    placeholder="ex: BCEE-QA ou http://server:8080/tfs/Collection"
                    autoFocus
                    className="w-full"
                  />
                  <p className="text-xs text-overlay0">Nom de l'org cloud ou URL complète on-premise</p>
                </div>

                {/* PAT */}
                <div className="space-y-1">
                  <label className="label">Personal Access Token *</label>
                  <div className="relative">
                    <input
                      type={showPat ? 'text' : 'password'}
                      value={form.pat}
                      onChange={handleChange('pat')}
                      placeholder="••••••••••••••••"
                      className="w-full pr-9"
                    />
                    <button
                      onClick={() => setShowPat(v => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-overlay0 hover:text-text transition-colors"
                    >
                      {showPat ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-overlay0">Permission "Test Management (Read)" requise</p>
                </div>

                {/* Version API */}
                <div className="space-y-1">
                  <label className="label">Version API</label>
                  <select value={form.apiVersion} onChange={handleChange('apiVersion')} className="w-full">
                    {API_VERSIONS.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
                  </select>
                </div>

                {/* Résultat test */}
                {testResult && (
                  <div className={cn(
                    'flex items-start gap-2.5 rounded-lg border p-3 text-sm',
                    testResult.success
                      ? 'border-green/20 bg-green/5 text-green'
                      : 'border-red/20 bg-red/5 text-red'
                  )}>
                    {testResult.success
                      ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                      : <WifiOff className="w-4 h-4 mt-0.5 shrink-0" />
                    }
                    {testResult.message}
                  </div>
                )}
                {error && !testResult && (
                  <div className="flex items-start gap-2.5 rounded-lg border border-red/20 bg-red/5 p-3 text-sm text-red">
                    <WifiOff className="w-4 h-4 mt-0.5 shrink-0" />
                    {error}
                  </div>
                )}

                {/* Boutons */}
                <div className="flex gap-2 pt-1">
                  <Button
                    variant="outline"
                    onClick={handleTest}
                    disabled={isTesting || isLoading || !form.organisation || !form.pat}
                    className="flex-1"
                  >
                    {isTesting
                      ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Test…</>
                      : 'Tester'
                    }
                  </Button>
                  <Button
                    onClick={handleConnect}
                    disabled={isLoading || !form.organisation || !form.pat}
                    className="flex-1"
                  >
                    {isLoading
                      ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Connexion…</>
                      : 'Sauvegarder'
                    }
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
