import React, { useState, useEffect, useCallback } from 'react'
import {
  Box, Typography, Alert, CircularProgress, Card, CardContent,
  Chip, IconButton, Button, Select, MenuItem, FormControl,
  InputLabel, Tooltip, Dialog, DialogTitle, DialogContent,
  DialogContentText, DialogActions, Divider, Stack,
} from '@mui/material'
import {
  Delete, FolderOpen, DeleteSweep, Refresh, History as HistoryIcon,
} from '@mui/icons-material'
import { reportHistoryApi, systemApi } from '../api/ipcApi'
import { palette } from '../theme/theme'

// ─── Helpers ──────────────────────────────────────────────────────────────

function formatDate(isoString) {
  if (!isoString) return '—'
  return new Date(isoString).toLocaleString('fr-FR')
}

function PassRateChip({ value }) {
  if (value == null) return <Chip label="—" size="small" sx={{ bgcolor: 'rgba(108,112,134,0.2)', color: '#6c7086' }} />
  const ok = value >= 80
  return (
    <Chip
      label={`${value}%`}
      size="small"
      sx={{
        fontWeight: 700,
        bgcolor: ok ? 'rgba(166,227,161,0.2)' : 'rgba(243,139,168,0.2)',
        color: ok ? palette.green : palette.red,
      }}
    />
  )
}

function FormatChip({ format }) {
  const color = {
    pdf: palette.red,
    excel: palette.green,
    pptx: palette.peach,
    html: palette.blue,
  }[format?.toLowerCase()] || palette.overlay0
  return (
    <Chip
      label={format?.toUpperCase()}
      size="small"
      sx={{ bgcolor: `${color}22`, color, fontWeight: 600, fontSize: '0.7rem' }}
    />
  )
}

// ─── Main component ───────────────────────────────────────────────────────

export default function ReportHistoryPage() {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [planFilter, setPlanFilter] = useState('__all__')
  const [confirmClear, setConfirmClear] = useState(false)
  const [openingFile, setOpeningFile] = useState(null)

  // ── Load history ───────────────────────────────────────────────────
  const loadHistory = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const all = await reportHistoryApi.getAll()
      setHistory(all || [])
    } catch (err) {
      setError(`Erreur lors du chargement de l'historique : ${err.message}`)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadHistory() }, [loadHistory])

  // ── Plan list for filter ───────────────────────────────────────────
  const plans = React.useMemo(() => {
    const seen = new Map()
    history.forEach((e) => {
      if (e.planId && !seen.has(e.planId)) seen.set(e.planId, e.planName || `Plan #${e.planId}`)
    })
    return [...seen.entries()].map(([id, name]) => ({ id, name }))
  }, [history])

  // ── Filtered entries ───────────────────────────────────────────────
  const filtered = React.useMemo(
    () => planFilter === '__all__' ? history : history.filter((e) => String(e.planId) === String(planFilter)),
    [history, planFilter]
  )

  // ── Delete entry ───────────────────────────────────────────────────
  const handleDelete = async (id) => {
    try {
      await reportHistoryApi.delete(id)
      setHistory((prev) => prev.filter((e) => e.id !== id))
    } catch (err) {
      setError(`Suppression impossible : ${err.message}`)
    }
  }

  // ── Clear all ──────────────────────────────────────────────────────
  const handleClear = async () => {
    setConfirmClear(false)
    try {
      await reportHistoryApi.clear()
      setHistory([])
    } catch (err) {
      setError(`Impossible de vider l'historique : ${err.message}`)
    }
  }

  // ── Open file ──────────────────────────────────────────────────────
  const handleOpenFile = async (file) => {
    setOpeningFile(file.path)
    try {
      await systemApi.openFile(file.path)
    } catch (_) {
      // Silently ignore — shell may fail gracefully
    } finally {
      setOpeningFile(null)
    }
  }

  // ── Group by plan for display ──────────────────────────────────────
  const grouped = React.useMemo(() => {
    const groups = new Map()
    filtered.forEach((entry) => {
      const key = entry.planId ? String(entry.planId) : '__no_plan__'
      const label = entry.planName || `Plan #${entry.planId}` || 'Plan inconnu'
      if (!groups.has(key)) groups.set(key, { label, entries: [] })
      groups.get(key).entries.push(entry)
    })
    return [...groups.entries()].map(([key, g]) => ({ key, ...g }))
  }, [filtered])

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <Box sx={{ p: 3, height: '100%', overflow: 'auto' }}>
      {/* Title row */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, flexWrap: 'wrap', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <HistoryIcon sx={{ color: palette.blue }} />
          <Typography variant="h2">Historique des rapports</Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Rafraîchir">
            <IconButton onClick={loadHistory} size="small">
              <Refresh fontSize="small" />
            </IconButton>
          </Tooltip>
          {history.length > 0 && (
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteSweep />}
              size="small"
              onClick={() => setConfirmClear(true)}
            >
              Tout effacer
            </Button>
          )}
        </Stack>
      </Box>

      <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>
        {history.length} rapport{history.length !== 1 ? 's' : ''} enregistré{history.length !== 1 ? 's' : ''}
      </Typography>

      {/* Errors */}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {/* Loading */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress size={32} />
        </Box>
      )}

      {/* Empty state */}
      {!loading && history.length === 0 && (
        <Box sx={{ textAlign: 'center', mt: 6 }}>
          <HistoryIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h4" color="text.secondary">Aucun rapport généré</Typography>
          <Typography variant="body2" color="text.disabled" sx={{ mt: 1 }}>
            Les rapports exportés depuis le générateur apparaîtront ici.
          </Typography>
        </Box>
      )}

      {/* Filter bar */}
      {!loading && history.length > 0 && (
        <FormControl size="small" sx={{ mb: 3, minWidth: 280 }}>
          <InputLabel>Filtrer par plan de test</InputLabel>
          <Select
            value={planFilter}
            label="Filtrer par plan de test"
            onChange={(e) => setPlanFilter(e.target.value)}
          >
            <MenuItem value="__all__">Tous les plans ({history.length})</MenuItem>
            {plans.map((p) => (
              <MenuItem key={p.id} value={String(p.id)}>{p.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      {/* Groups */}
      {!loading && grouped.map((group) => (
        <Box key={group.key} sx={{ mb: 4 }}>
          <Typography
            variant="overline"
            sx={{ color: palette.blue, fontWeight: 700, letterSpacing: '0.1em', mb: 1, display: 'block' }}
          >
            {group.label} — {group.entries.length} rapport{group.entries.length !== 1 ? 's' : ''}
          </Typography>
          <Divider sx={{ mb: 2 }} />

          <Stack spacing={2}>
            {group.entries.map((entry) => (
              <HistoryCard
                key={entry.id}
                entry={entry}
                onDelete={handleDelete}
                onOpenFile={handleOpenFile}
                openingFile={openingFile}
              />
            ))}
          </Stack>
        </Box>
      ))}

      {/* Confirm clear dialog */}
      <Dialog open={confirmClear} onClose={() => setConfirmClear(false)}>
        <DialogTitle>Vider l'historique ?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Cette action supprimera définitivement les {history.length} entrées de l'historique.
            Les fichiers de rapport sur disque ne seront pas supprimés.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmClear(false)}>Annuler</Button>
          <Button onClick={handleClear} color="error" variant="contained">Supprimer tout</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

// ─── HistoryCard ──────────────────────────────────────────────────────────

function HistoryCard({ entry, onDelete, onOpenFile, openingFile }) {
  return (
    <Card variant="outlined">
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1, flexWrap: 'wrap' }}>
          {/* Left: info */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.5 }}>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                {entry.appName || '—'}
                {entry.appVersion ? ` v${entry.appVersion}` : ''}
              </Typography>
              {entry.globalStatus && (
                <Chip
                  label={entry.globalStatus}
                  size="small"
                  sx={{
                    bgcolor: entry.globalStatus === 'Réussi' ? 'rgba(166,227,161,0.2)' : 'rgba(243,139,168,0.2)',
                    color: entry.globalStatus === 'Réussi' ? palette.green : palette.red,
                    fontWeight: 700,
                    fontSize: '0.7rem',
                  }}
                />
              )}
              <PassRateChip value={entry.passRate} />
            </Box>

            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {entry.project ? `${entry.project} · ` : ''}
              {entry.projectRef ? `Réf: ${entry.projectRef} · ` : ''}
              {entry.totalTests != null ? `${entry.totalTests} tests · ` : ''}
              {formatDate(entry.date)}
            </Typography>

            {/* Formats + files */}
            <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
              {(entry.formats || []).map((f) => <FormatChip key={f} format={f} />)}
            </Box>
          </Box>

          {/* Right: actions */}
          <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
            {/* Open buttons per file */}
            {(entry.files || []).map((file) => (
              <Tooltip
                key={file.path}
                title={file.exists === false ? 'Fichier introuvable sur le disque' : `Ouvrir ${file.format?.toUpperCase()}`}
              >
                <span>
                  <IconButton
                    size="small"
                    disabled={file.exists === false || openingFile === file.path}
                    onClick={() => onOpenFile(file)}
                    sx={{ color: palette.blue }}
                  >
                    {openingFile === file.path
                      ? <CircularProgress size={16} />
                      : <FolderOpen fontSize="small" />
                    }
                  </IconButton>
                </span>
              </Tooltip>
            ))}
            {/* Delete */}
            <Tooltip title="Supprimer cette entrée">
              <IconButton size="small" onClick={() => onDelete(entry.id)} sx={{ color: palette.red }}>
                <Delete fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        </Box>
      </CardContent>
    </Card>
  )
}
