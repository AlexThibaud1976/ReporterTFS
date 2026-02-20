import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box, Card, CardContent, TextField, Button, Typography,
  InputAdornment, IconButton, Alert, CircularProgress,
  Select, MenuItem, FormControl, List, ListItem,
  ListItemButton, ListItemText, Tooltip, Chip,
} from '@mui/material'
import {
  Visibility, VisibilityOff, CheckCircle, WifiFind,
  Add, Delete, ArrowForward, Storage,
} from '@mui/icons-material'
import { useAuthStore } from '../store/authStore'
import { authApi } from '../api/ipcApi'
import { palette } from '../theme/theme'

const API_VERSIONS = [
  { value: '5.0', label: '5.0 (Recommandé pour Test Plans)' },
  { value: '6.0', label: '6.0 (Azure DevOps Server 2019+)' },
  { value: '7.0', label: '7.0 (Azure DevOps Server 2022)' },
]

const DEFAULT_FORM = { organisation: '', pat: '', apiVersion: '5.0' }

export default function ConnectionPage() {
  const navigate = useNavigate()
  const { connections, isConnected, isLoading, error, loadConnections, connectAndSave, switchConnection, deleteConnection, clearError } = useAuthStore()
  const [form, setForm] = useState(DEFAULT_FORM)
  const [showPat, setShowPat] = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [showNewForm, setShowNewForm] = useState(false)
  const [isTesting, setIsTesting] = useState(false)

  useEffect(() => { loadConnections() }, [])
  useEffect(() => { if (isConnected) navigate('/dashboard') }, [isConnected])

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
    setTestResult(null)
    if (error) clearError()
  }

  const handleTest = async () => {
    setIsTesting(true)
    const r = await authApi.testConnection({ organisation: form.organisation, pat: form.pat, apiVersion: form.apiVersion })
    setTestResult(r)
    setIsTesting(false)
  }

  const handleConnect = async () => {
    const result = await connectAndSave({ name: form.organisation, organisation: form.organisation, pat: form.pat, apiVersion: form.apiVersion })
    if (result.success) { setTestResult({ success: true, message: result.message }); setTimeout(() => navigate('/dashboard'), 800) }
    else setTestResult({ success: false, message: result.message })
  }

  return (
    <Box sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `radial-gradient(ellipse at 30% 50%, ${palette.blue}15 0%, transparent 60%), ${palette.base}`, p: 3 }}>
      <Box sx={{ width: '100%', maxWidth: 880, display: 'flex', gap: 3, alignItems: 'flex-start' }}>

        {/* Branding gauche */}
        <Box sx={{ flex: 1, display: { xs: 'none', md: 'block' }, pt: 2 }}>
          <Box sx={{ width: 56, height: 56, borderRadius: 2, background: `linear-gradient(135deg, ${palette.blue}, ${palette.mauve})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 20, color: palette.base, mb: 3 }}>TFS</Box>
          <Typography variant="h2" sx={{ mb: 1 }}>TFSReporter</Typography>
          <Typography variant="body1" sx={{ color: palette.subtext1, mb: 3, lineHeight: 1.8 }}>Générez des rapports de test professionnels depuis votre Azure DevOps en quelques clics.</Typography>
          {['Export PowerPoint & HTML interactif', 'Métriques et graphiques', 'Traçabilité & liens ADO', '100% sécurisé, PAT chiffré'].map((f) => (
            <Box key={f} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
              <CheckCircle sx={{ fontSize: 16, color: palette.green }} />
              <Typography variant="body2" sx={{ color: palette.subtext1 }}>{f}</Typography>
            </Box>
          ))}
        </Box>

        {/* Card formulaire */}
        <Card sx={{ flex: 1, maxWidth: 460 }}>
          <CardContent sx={{ p: 0 }}>

            {/* Header card */}
            <Box sx={{ px: 3, pt: 2.5, pb: 2, borderBottom: `1px solid ${palette.surface0}`, display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Storage sx={{ color: palette.blue }} />
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 600 }}>Connexion Azure DevOps</Typography>
                <Typography variant="caption" sx={{ color: palette.overlay0 }}>Configurez l'accès à votre instance ADO</Typography>
              </Box>
            </Box>

            <Box sx={{ px: 3, py: 2.5 }}>

              {/* Liste connexions sauvegardées */}
              {connections.length > 0 && !showNewForm ? (
                <>
                  <Typography variant="h6" sx={{ mb: 1.5 }}>CONNEXIONS SAUVEGARDÉES</Typography>
                  <List disablePadding sx={{ mb: 2 }}>
                    {connections.map((conn) => (
                      <ListItem key={conn.name} disablePadding sx={{ mb: 0.5 }}
                        secondaryAction={
                          <Tooltip title="Supprimer">
                            <IconButton size="small" onClick={() => deleteConnection(conn.name)} sx={{ color: palette.red }}>
                              <Delete fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        }
                      >
                        <ListItemButton onClick={() => switchConnection(conn.name)} sx={{ borderRadius: 1, pr: 5 }}>
                          <Storage fontSize="small" sx={{ color: palette.blue, mr: 1.5 }} />
                          <ListItemText
                            primary={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>{conn.organisation}</Typography>
                              {conn.project && <Chip label={conn.project} size="small" sx={{ height: 18, fontSize: '0.7rem' }} />}
                            </Box>}
                            secondary={`API v${conn.apiVersion || '5.0'}`}
                            secondaryTypographyProps={{ fontSize: '0.72rem' }}
                          />
                          <ArrowForward fontSize="small" sx={{ color: palette.overlay0 }} />
                        </ListItemButton>
                      </ListItem>
                    ))}
                  </List>
                  <Button startIcon={<Add />} variant="outlined" fullWidth size="small" onClick={() => { setShowNewForm(true); setForm(DEFAULT_FORM); setTestResult(null) }}>
                    Nouvelle connexion
                  </Button>
                </>
              ) : (
                /* Formulaire */
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>

                  {/* Organisation */}
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.75 }}>Organisation Azure DevOps *</Typography>
                    <TextField value={form.organisation} onChange={handleChange('organisation')} fullWidth placeholder="ex: BCEE-QA" size="small" autoFocus />
                    <Typography variant="caption" sx={{ color: palette.overlay0, mt: 0.5, display: 'block' }}>
                      Nom de votre organisation ou URL complète. Visible dans l'URL: dev.azure.com/<strong>organisation</strong>
                    </Typography>
                  </Box>

                  {/* PAT */}
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.75 }}>Personal Access Token (PAT) *</Typography>
                    <TextField
                      type={showPat ? 'text' : 'password'}
                      value={form.pat} onChange={handleChange('pat')} fullWidth size="small"
                      InputProps={{ endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => setShowPat(!showPat)} edge="end" size="small">
                            {showPat ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                          </IconButton>
                        </InputAdornment>
                      )}}
                    />
                    <Typography variant="caption" sx={{ color: palette.overlay0, mt: 0.5, display: 'block' }}>
                      Token avec permission "Test Management (Read)". <Box component="a" href="https://learn.microsoft.com/fr-fr/azure/devops/organizations/accounts/use-personal-access-tokens-to-authenticate" target="_blank" sx={{ color: palette.blue }}>Comment créer un PAT ?</Box>
                    </Typography>
                  </Box>

                  {/* Version API */}
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.75 }}>Version API</Typography>
                    <FormControl fullWidth size="small">
                      <Select value={form.apiVersion} onChange={handleChange('apiVersion')}>
                        {API_VERSIONS.map((v) => <MenuItem key={v.value} value={v.value}>{v.label}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Box>

                  {/* Résultat */}
                  {testResult && <Alert severity={testResult.success ? 'success' : 'error'} sx={{ py: 0.75 }}>{testResult.message}</Alert>}
                  {error && !testResult && <Alert severity="error" sx={{ py: 0.75 }}>{error}</Alert>}

                  {/* Boutons */}
                  <Box sx={{ display: 'flex', gap: 1.5, pt: 0.5 }}>
                    {connections.length > 0 && (
                      <Button variant="outlined" onClick={() => { setShowNewForm(false); setTestResult(null) }} sx={{ flex: 1 }}>Annuler</Button>
                    )}
                    <Button
                      variant="outlined"
                      startIcon={isTesting ? <CircularProgress size={14} /> : <WifiFind />}
                      disabled={isTesting || isLoading || !form.organisation || !form.pat}
                      onClick={handleTest}
                      sx={{ flex: 1 }}
                    >
                      Tester la Connexion
                    </Button>
                    <Button
                      variant="contained"
                      onClick={handleConnect}
                      disabled={isLoading || !form.organisation || !form.pat}
                      startIcon={isLoading ? <CircularProgress size={14} /> : null}
                      sx={{ flex: 1.2 }}
                    >
                      {isLoading ? 'Connexion...' : '💾 Sauvegarder'}
                    </Button>
                  </Box>
                </Box>
              )}
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  )
}
