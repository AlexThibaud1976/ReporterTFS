import React, { useState } from 'react'
import {
  Box, Typography, Card, CardContent, TextField, Button,
  Grid, MenuItem, Select, FormControl, InputLabel, Stepper,
  Step, StepLabel, Alert, CircularProgress, Divider, Chip,
  FormControlLabel, Switch, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material'
import { DatePicker } from '@mui/x-date-pickers'
import {
  Slideshow, Code,
  Check, ArrowBack, ArrowForward, AttachFile,
  Email as EmailIcon, Send,
} from '@mui/icons-material'
import { useReportStore } from '../store/reportStore'
import { useAdoStore } from '../store/adoStore'
import { exportApi, reportHistoryApi, adoApi, emailApi } from '../api/ipcApi'
import { palette } from '../theme/theme'

const STEPS = ['Métadonnées', 'Format d\'export', 'Génération']

const EXPORT_FORMATS = [
  { id: 'pptx', label: 'PowerPoint', icon: <Slideshow />, description: 'Présentation comité de pilotage', color: palette.peach },
  { id: 'html', label: 'HTML', icon: <Code />, description: 'Rapport interactif intranet', color: palette.blue },
]

const GLOBAL_STATUS = ['Réussi', 'Échoué', 'En cours', 'Annulé']

export default function ReportBuilderPage() {
  const { metadata, updateMetadata, validateMetadata, exportProgress, setExportProgress, resetExportProgress } = useReportStore()
  const { fullPlanData, selectedProject, selectedPlan, selectedSuiteIds } = useAdoStore()

  const [activeStep, setActiveStep] = useState(0)
  const [selectedFormats, setSelectedFormats] = useState(['pptx'])
  const [validationError, setValidationError] = useState(null)
  const [includeAttachments, setIncludeAttachments] = useState(false)

  // ─── Email ───────────────────────────────────────────────────────────────
  const [emailOpen, setEmailOpen] = useState(false)
  const [emailTo, setEmailTo] = useState('')
  const [emailSubject, setEmailSubject] = useState('')
  const [emailSending, setEmailSending] = useState(false)
  const [emailResult, setEmailResult] = useState(null)

  const handleFormatToggle = (id) => {
    setSelectedFormats((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    )
  }

  const handleNext = () => {
    if (activeStep === 0) {
      const { valid, missing } = validateMetadata()
      if (!valid) {
        setValidationError(`Champs obligatoires manquants : ${missing.join(', ')}`)
        return
      }
      setValidationError(null)
    }
    setActiveStep((s) => s + 1)
  }

  const handleBack = () => setActiveStep((s) => s - 1)

  // ─── Email handlers ──────────────────────────────────────────────────────

  const handleOpenEmailDialog = () => {
    const appLabel = [metadata.applicationName, metadata.applicationVersion].filter(Boolean).join(' ')
    setEmailSubject(`TFSReport — ${appLabel || 'Rapport'}${metadata.testEnvironment ? ` (${metadata.testEnvironment})` : ''}`)
    setEmailResult(null)
    setEmailTo('')
    setEmailOpen(true)
  }

  const handleSendEmail = async () => {
    setEmailSending(true)
    setEmailResult(null)
    try {
      const recipients = emailTo.split(',').map((s) => s.trim()).filter(Boolean)
      if (recipients.length === 0) {
        setEmailResult({ success: false, message: 'Veuillez saisir au moins un destinataire.' })
        setEmailSending(false)
        return
      }
      // Sécurité : le smtp n'est jamais chargé dans le renderer.
      // Le main se charge de récupérer les credentials depuis le store.
      const result = await emailApi.sendReport({
        to: recipients,
        subject: emailSubject,
        attachments: exportProgress.generatedFiles || [],
      })
      setEmailResult(result)
      if (result.success) setTimeout(() => setEmailOpen(false), 2000)
    } catch (err) {
      setEmailResult({ success: false, message: `Erreur inattendue : ${err.message}` })
    }
    setEmailSending(false)
  }

  const handleGenerate = async () => {
    if (!fullPlanData) return

    setExportProgress({ isExporting: true, progress: 0, error: null })

    try {
    // Si des pièces jointes sont demandées, refaire un appel enrichi
    let planDataToUse = fullPlanData
    if (includeAttachments && selectedProject && selectedPlan) {
      setExportProgress({ isExporting: true, step: 'Récupération des pièces jointes...', progress: 5 })
      try {
        const opts = { includeAttachments: true }
        if (selectedSuiteIds && selectedSuiteIds.length > 0) opts.suiteIds = selectedSuiteIds
        planDataToUse = await adoApi.getFullPlanData(
          selectedProject.name,
          selectedPlan.id,
          opts
        )
      } catch (_) {
        // On continue avec les données existantes si l'appel échoue
      }
    }

    const reportData = { metadata, planData: planDataToUse }
    const results = []

    for (let i = 0; i < selectedFormats.length; i++) {
      const format = selectedFormats[i]
      setExportProgress({
        step: `Génération ${format.toUpperCase()}...`,
        progress: Math.round((i / selectedFormats.length) * 80),
      })

      const _ts = new Date().toISOString().replace('T', '_').replace(/:/g, '-').split('.')[0]
      const defaultName = `TFSReport_${metadata.projectRef || 'rapport'}_${_ts}.${format === 'pptx' ? 'pptx' : format}`
      const outputPath = await exportApi.chooseOutputPath(defaultName)
      if (!outputPath) continue

      let result
      if (format === 'pptx') result = await exportApi.toPptx(reportData, outputPath)
      else if (format === 'html') result = await exportApi.toHtml(reportData, outputPath)

      results.push({ format, ...result, outputPath })
    }

    const successfulPaths = results.filter((r) => r.success).map((r) => r.outputPath)

    setExportProgress({
      isExporting: false,
      progress: 100,
      step: 'Terminé !',
      lastExportPath: results[0]?.outputPath,
      generatedFiles: successfulPaths,
    })
    setActiveStep(2)

    // Sauvegarder dans l'historique
    const successfulResults = results.filter((r) => r.success)
    if (successfulResults.length > 0) {
      try {
        await reportHistoryApi.add({
          planId: String(fullPlanData.plan?.id ?? ''),
          planName: fullPlanData.plan?.name,
          project: fullPlanData.project || '',
          passRate: fullPlanData.metrics?.passRate,
          totalTests: fullPlanData.metrics?.total,
          globalStatus: metadata.globalStatus,
          projectRef: metadata.projectRef,
          appName: metadata.applicationName,
          appVersion: metadata.applicationVersion,
          formats: successfulResults.map((r) => r.format),
          files: successfulResults.map((r) => ({ format: r.format, path: r.outputPath })),
        })
      } catch (_) { /* Historique non bloquant */ }
    }
    } catch (err) {
      setExportProgress({ isExporting: false, error: err.message, step: '' })
    }
  }

  return (
    <Box sx={{ p: 3, height: '100%', overflow: 'auto' }}>
      <Typography variant="h2" sx={{ mb: 1 }}>Nouveau rapport</Typography>
      <Typography variant="body2" sx={{ mb: 3 }}>
        {fullPlanData
          ? `Plan : ${fullPlanData.plan?.name} — ${fullPlanData.metrics?.total} tests`
          : 'Aucun plan sélectionné — retournez au tableau de bord'}
      </Typography>

      {!fullPlanData && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Aucune donnée ADO chargée. Sélectionnez et analysez un plan de test depuis le tableau de bord.
        </Alert>
      )}

      {/* ─── Stepper ──────────────────────────────────────────────────────── */}
      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {STEPS.map((label) => (
          <Step key={label}><StepLabel>{label}</StepLabel></Step>
        ))}
      </Stepper>

      {/* ─── Étape 0 : Métadonnées ─────────────────────────────────────── */}
      {activeStep === 0 && (
        <Card>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h4" sx={{ mb: 2 }}>Informations du rapport</Typography>
            <Grid container spacing={2}>
              <MetaField label="Référence projet *" field="projectRef" metadata={metadata} onChange={updateMetadata} />
              <MetaField label="Numéro de change" field="changeNumber" metadata={metadata} onChange={updateMetadata} />
              <MetaField label="Contact IT" field="itContact" metadata={metadata} onChange={updateMetadata} />
              <MetaField label="Contact métier" field="businessContact" metadata={metadata} onChange={updateMetadata} />
              <MetaField label="Domaine fonctionnel" field="functionalDomain" metadata={metadata} onChange={updateMetadata} />
              <MetaField label="Nom de l'application *" field="applicationName" metadata={metadata} onChange={updateMetadata} />
              <MetaField label="Version de l'application" field="applicationVersion" metadata={metadata} onChange={updateMetadata} />
              <MetaField label="Environnement de test *" field="testEnvironment" metadata={metadata} onChange={updateMetadata} placeholder="ex: Recette, Pré-prod, UAT" />
              <Grid item xs={12}>
                <TextField
                  label="Périmètre de test"
                  value={metadata.testScope}
                  onChange={(e) => updateMetadata('testScope', e.target.value)}
                  fullWidth multiline rows={2}
                  placeholder="Décrire les fonctionnalités couvertes..."
                />
              </Grid>

              {/* Dates */}
              <Grid item xs={12} sm={6}>
                <DatePicker
                  label="Date de début"
                  value={metadata.startDate}
                  onChange={(val) => updateMetadata('startDate', val)}
                  slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <DatePicker
                  label="Date de fin"
                  value={metadata.endDate}
                  onChange={(val) => updateMetadata('endDate', val)}
                  slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                />
              </Grid>

              <MetaField label="Testeur(s) *" field="testers" metadata={metadata} onChange={updateMetadata} placeholder="ex: Jean Dupont, Marie Martin" />
              <MetaField label="Approbateur" field="approver" metadata={metadata} onChange={updateMetadata} />

              {/* Statut global */}
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Statut global</InputLabel>
                  <Select
                    value={metadata.globalStatus}
                    label="Statut global"
                    onChange={(e) => updateMetadata('globalStatus', e.target.value)}
                  >
                    {GLOBAL_STATUS.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            {validationError && <Alert severity="error" sx={{ mt: 2 }}>{validationError}</Alert>}
          </CardContent>
        </Card>
      )}

      {/* ─── Étape 1 : Format d'export ────────────────────────────────── */}
      {activeStep === 1 && (
        <Box>
          <Typography variant="h4" sx={{ mb: 2 }}>Choisir les formats d'export</Typography>
          <Grid container spacing={2}>
            {EXPORT_FORMATS.map((fmt) => {
              const selected = selectedFormats.includes(fmt.id)
              return (
                <Grid item xs={12} sm={6} md={3} key={fmt.id}>
                  <Card
                    onClick={() => handleFormatToggle(fmt.id)}
                    sx={{
                      cursor: 'pointer',
                      border: `2px solid ${selected ? fmt.color : palette.surface0}`,
                      transition: 'all 0.15s ease',
                      '&:hover': { borderColor: fmt.color, transform: 'translateY(-2px)' },
                    }}
                  >
                    <CardContent sx={{ p: 2.5, textAlign: 'center' }}>
                      <Box sx={{ color: fmt.color, fontSize: 40, mb: 1 }}>{fmt.icon}</Box>
                      <Typography variant="h4" sx={{ mb: 0.5 }}>{fmt.label}</Typography>
                      <Typography variant="caption" sx={{ color: palette.overlay0 }}>{fmt.description}</Typography>
                      {selected && (
                        <Box sx={{ mt: 1 }}>
                          <Chip label="Sélectionné" size="small" icon={<Check fontSize="small" />}
                            sx={{ backgroundColor: `${fmt.color}20`, color: fmt.color }} />
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              )
            })}
          </Grid>

          {/* Option pièces jointes */}
          <Card sx={{ mt: 2, border: `1px solid ${includeAttachments ? palette.blue : palette.surface0}` }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <AttachFile sx={{ color: palette.blue, fontSize: 20 }} />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>Pièces jointes</Typography>
                  <Typography variant="caption" sx={{ color: palette.overlay0 }}>
                    Intègre les captures d'écran et fichiers des résultats de test dans le rapport HTML.
                    Un appel supplémentaire à l'API ADO sera effectué lors de la génération.
                  </Typography>
                </Box>
                <Switch
                  checked={includeAttachments}
                  onChange={(e) => setIncludeAttachments(e.target.checked)}
                  color="primary"
                />
              </Box>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* ─── Étape 2 : Génération ────────────────────────────────────── */}
      {activeStep === 2 && (
        <>
          <Card>
            <CardContent sx={{ p: 3, textAlign: 'center' }}>
              {exportProgress.isExporting ? (
                <>
                  <CircularProgress size={48} sx={{ mb: 2 }} />
                  <Typography variant="h4">{exportProgress.step}</Typography>
                </>
              ) : (
                <>
                  <Check sx={{ fontSize: 64, color: palette.green, mb: 2 }} />
                  <Typography variant="h3" sx={{ mb: 1 }}>Rapport généré avec succès !</Typography>
                  <Typography variant="body2" sx={{ color: palette.subtext1 }}>
                    Les fichiers ont été ouverts automatiquement.
                  </Typography>
                  {exportProgress.generatedFiles?.length > 0 && (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 0.5, mt: 1.5 }}>
                      {exportProgress.generatedFiles.map((f, i) => (
                        <Chip key={i} label={f.split('\\').pop()} size="small" sx={{ fontSize: '0.7rem' }} />
                      ))}
                    </Box>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {!exportProgress.isExporting && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <Button
                variant="outlined"
                startIcon={<EmailIcon />}
                onClick={handleOpenEmailDialog}
                disabled={!exportProgress.generatedFiles?.length}
              >
                Envoyer par email
              </Button>
            </Box>
          )}

          {/* ─── Dialog email ──────────────────────────────────────── */}
          <Dialog open={emailOpen} onClose={() => setEmailOpen(false)} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <EmailIcon sx={{ color: palette.blue }} />
              Envoyer par email
            </DialogTitle>
            <DialogContent>
              <TextField
                label="Destinataire(s)"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                fullWidth
                sx={{ mt: 1, mb: 2 }}
                placeholder="prenom.nom@entreprise.com, autre@exemple.com"
                helperText="Séparez plusieurs adresses par des virgules"
                autoFocus
              />
              <TextField
                label="Sujet"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                fullWidth
                sx={{ mb: 2 }}
              />
              {exportProgress.generatedFiles?.length > 0 && (
                <Box>
                  <Typography variant="caption" sx={{ color: palette.overlay0 }}>Pièces jointes :</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                    {exportProgress.generatedFiles.map((f, i) => (
                      <Chip key={i} label={f.split('\\').pop()} size="small" />
                    ))}
                  </Box>
                </Box>
              )}
              {emailResult && (
                <Alert severity={emailResult.success ? 'success' : 'error'} sx={{ mt: 2 }}>
                  {emailResult.message}
                </Alert>
              )}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={() => setEmailOpen(false)} variant="outlined">Annuler</Button>
              <Button
                onClick={handleSendEmail}
                variant="contained"
                disabled={!emailTo.trim() || emailSending}
                startIcon={emailSending ? <CircularProgress size={16} /> : <Send />}
              >
                {emailSending ? 'Envoi en cours...' : 'Envoyer'}
              </Button>
            </DialogActions>
          </Dialog>
        </>
      )}

      {/* ─── Navigation ───────────────────────────────────────────────── */}
      {activeStep < 2 && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
          <Button startIcon={<ArrowBack />} onClick={handleBack} disabled={activeStep === 0} variant="outlined">
            Retour
          </Button>
          {activeStep < 1 ? (
            <Button endIcon={<ArrowForward />} onClick={handleNext} variant="contained">
              Suivant
            </Button>
          ) : (
            <Button
              onClick={handleGenerate}
              variant="contained"
              disabled={selectedFormats.length === 0 || !fullPlanData || exportProgress.isExporting}
              startIcon={exportProgress.isExporting ? <CircularProgress size={16} /> : <Slideshow />}
            >
              {exportProgress.isExporting ? 'Génération...' : 'Générer les rapports'}
            </Button>
          )}
        </Box>
      )}
    </Box>
  )
}

// ─── Helper composant champ métadonnée ───────────────────────────────────
function MetaField({ label, field, metadata, onChange, placeholder }) {
  return (
    <Grid item xs={12} sm={6}>
      <TextField
        label={label}
        value={metadata[field] || ''}
        onChange={(e) => onChange(field, e.target.value)}
        fullWidth
        placeholder={placeholder}
      />
    </Grid>
  )
}
