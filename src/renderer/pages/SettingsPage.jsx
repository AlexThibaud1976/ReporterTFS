import React, { useState, useEffect } from 'react'
import {
  Box, Typography, Card, CardContent, TextField, Button,
  Divider, Switch, FormControlLabel, Alert, Chip, Grid,
  CircularProgress, IconButton, List, ListItem, ListItemText,
  ListItemSecondaryAction, Tooltip,
} from '@mui/material'
import {
  Save, Email, Schedule, Palette, Info, CheckCircle,
  Error as ErrorIcon, Delete, Add, ToggleOn, ToggleOff,
  Image as ImageIcon, Close,
} from '@mui/icons-material'
import { emailApi, scheduleApi, templateApi, systemApi } from '../api/ipcApi'
import { palette } from '../theme/theme'

const Section = ({ icon, title, children }) => (
  <Card sx={{ mb: 3 }}>
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, pb: 1.5, borderBottom: `1px solid ${palette.surface1}` }}>
        <Box sx={{ color: palette.blue }}>{icon}</Box>
        <Typography variant="h5">{title}</Typography>
      </Box>
      {children}
    </CardContent>
  </Card>
)

// ─── Fréquence lisible ────────────────────────────────────────────────────
const FREQ_LABELS = { daily: 'Quotidien', weekly: 'Hebdomadaire (lundi)', monthly: 'Mensuel (1er)' }

export default function SettingsPage() {
  // ── SMTP ─────────────────────────────────────────────────────────────────
  const [smtp, setSmtp] = useState({ host: '', port: '587', user: '', password: '', from: '', tls: true })
  const [smtpStatus, setSmtpStatus] = useState(null)
  const [smtpTesting, setSmtpTesting] = useState(false)
  const [smtpSaving, setSmtpSaving] = useState(false)

  // ── Planification ─────────────────────────────────────────────────────────
  const [schedules, setSchedules] = useState([])
  const [newSchedule, setNewSchedule] = useState({ name: '', frequency: 'weekly', hour: '08', recipients: '', formats: 'pdf' })
  const [showNewScheduleForm, setShowNewScheduleForm] = useState(false)
  const [scheduleSaving, setScheduleSaving] = useState(false)

  // ── Template ──────────────────────────────────────────────────────────────
  const [template, setTemplate] = useState({ accentColor: '#1e66f5', orgName: '', footerText: '', logoPath: '' })
  const [templateSaving, setTemplateSaving] = useState(false)

  // ── Système ───────────────────────────────────────────────────────────────
  const [version, setVersion] = useState('…')
  const [saved, setSaved] = useState(false)

  // ── Chargement initial ────────────────────────────────────────────────────
  useEffect(() => {
    // Sécurité : les paramètres SMTP ne sont jamais pré-remplis dans le formulaire.
    // L'utilisateur doit saisir ses identifiants à chaque fois.
    // La configuration sauvegardée est utilisée uniquement en interne pour l'envoi automatisé.
    scheduleApi.list().then(setSchedules).catch(() => {})
    templateApi.load().then((t) => { if (t) setTemplate(t) }).catch(() => {})
    systemApi.getVersion().then(setVersion).catch(() => {})
  }, [])

  // ─── Handlers SMTP ───────────────────────────────────────────────────────

  const handleTestSmtp = async () => {
    setSmtpTesting(true)
    setSmtpStatus(null)
    const result = await emailApi.testSmtp(smtp)
    setSmtpStatus(result)
    setSmtpTesting(false)
  }

  const handleSaveSmtp = async () => {
    setSmtpSaving(true)
    await emailApi.saveConfig(smtp)
    setSmtpSaving(false)
    showSaveConfirmation()
  }

  // ─── Handlers Planification ───────────────────────────────────────────────

  const handleAddSchedule = async () => {
    if (!newSchedule.name) return
    setScheduleSaving(true)
    const result = await scheduleApi.create({
      ...newSchedule,
      formats: newSchedule.formats.split(',').map((f) => f.trim()).filter(Boolean),
    })
    if (result.success) {
      const updated = await scheduleApi.list()
      setSchedules(updated)
      setNewSchedule({ name: '', frequency: 'weekly', hour: '08', recipients: '', formats: 'pdf' })
      setShowNewScheduleForm(false)
    }
    setScheduleSaving(false)
  }

  const handleDeleteSchedule = async (id) => {
    await scheduleApi.delete(id)
    setSchedules((prev) => prev.filter((s) => s.id !== id))
  }

  const handleToggleSchedule = async (id) => {
    const result = await scheduleApi.toggle(id)
    if (result.success) {
      setSchedules((prev) =>
        prev.map((s) => (s.id === id ? { ...s, active: result.active } : s))
      )
    }
  }

  // ─── Handlers Template ────────────────────────────────────────────────────

  const handleChooseLogo = async () => {
    const filePath = await templateApi.chooseLogo()
    if (filePath) setTemplate((prev) => ({ ...prev, logoPath: filePath }))
  }

  const handleSaveTemplate = async () => {
    setTemplateSaving(true)
    await templateApi.save(template)
    setTemplateSaving(false)
    showSaveConfirmation()
  }

  const showSaveConfirmation = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  // ─── Rendu ────────────────────────────────────────────────────────────────

  return (
    <Box sx={{ p: 3, maxWidth: 760, height: '100%', overflow: 'auto' }}>
      <Typography variant="h2" sx={{ mb: 0.5 }}>Paramètres</Typography>
      <Typography variant="body2" sx={{ color: palette.overlay0, mb: 3 }}>
        Configuration SMTP, planification et personnalisation
      </Typography>

      {saved && <Alert severity="success" icon={<CheckCircle />} sx={{ mb: 2 }}>Paramètres sauvegardés ✓</Alert>}

      {/* ─── SMTP ──────────────────────────────────────────────────────── */}
      <Section icon={<Email />} title="Envoi d'emails">
        <Grid container spacing={2}>
          <Grid item xs={8}>
            <TextField label="Serveur SMTP" value={smtp.host}
              onChange={(e) => setSmtp((p) => ({ ...p, host: e.target.value }))}
              fullWidth size="small" placeholder="smtp.entreprise.com" />
          </Grid>
          <Grid item xs={4}>
            <TextField label="Port" value={smtp.port}
              onChange={(e) => setSmtp((p) => ({ ...p, port: e.target.value }))}
              fullWidth size="small" />
          </Grid>
          <Grid item xs={6}>
            <TextField label="Utilisateur" value={smtp.user}
              onChange={(e) => setSmtp((p) => ({ ...p, user: e.target.value }))}
              fullWidth size="small" placeholder="user@entreprise.com" />
          </Grid>
          <Grid item xs={6}>
            <TextField label="Mot de passe" type="password" value={smtp.password}
              onChange={(e) => setSmtp((p) => ({ ...p, password: e.target.value }))}
              fullWidth size="small" />
          </Grid>
          <Grid item xs={8}>
            <TextField label="Adresse expéditeur" value={smtp.from}
              onChange={(e) => setSmtp((p) => ({ ...p, from: e.target.value }))}
              fullWidth size="small" placeholder="tfsreporter@entreprise.com" />
          </Grid>
          <Grid item xs={4} sx={{ display: 'flex', alignItems: 'center' }}>
            <FormControlLabel
              control={<Switch checked={!!smtp.tls} onChange={(e) => setSmtp((p) => ({ ...p, tls: e.target.checked }))} size="small" />}
              label={<Typography variant="body2">TLS/STARTTLS</Typography>}
            />
          </Grid>
        </Grid>

        {smtpStatus && (
          <Alert severity={smtpStatus.success ? 'success' : 'error'} sx={{ mt: 2 }}
            icon={smtpStatus.success ? <CheckCircle /> : <ErrorIcon />}>
            {smtpStatus.message}
          </Alert>
        )}

        <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
          <Button variant="outlined" size="small" onClick={handleTestSmtp}
            disabled={!smtp.host || smtpTesting}
            startIcon={smtpTesting ? <CircularProgress size={14} /> : <Email />}>
            {smtpTesting ? 'Test en cours…' : 'Tester la connexion'}
          </Button>
          <Button variant="contained" size="small" onClick={handleSaveSmtp}
            disabled={smtpSaving}
            startIcon={smtpSaving ? <CircularProgress size={14} /> : <Save />}>
            Sauvegarder
          </Button>
        </Box>
      </Section>

      {/* ─── Planification ───────────────────────────────────────────── */}
      <Section icon={<Schedule />} title="Exports automatiques planifiés">
        {schedules.length === 0 ? (
          <Typography variant="body2" sx={{ color: palette.overlay0, mb: 2 }}>
            Aucun planning configuré.
          </Typography>
        ) : (
          <List disablePadding sx={{ mb: 2 }}>
            {schedules.map((s) => (
              <ListItem key={s.id} disablePadding
                sx={{
                  mb: 1, px: 2, py: 1, borderRadius: 1,
                  bgcolor: palette.surface0,
                  border: `1px solid ${s.active ? `${palette.green}40` : `${palette.overlay0}20`}`,
                }}>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{s.name}</Typography>
                      <Chip label={s.active ? 'Actif' : 'Inactif'} size="small"
                        sx={{
                          bgcolor: s.active ? `${palette.green}25` : `${palette.overlay0}25`,
                          color: s.active ? palette.green : palette.overlay0,
                        }} />
                    </Box>
                  }
                  secondary={
                    <Typography variant="caption" sx={{ color: palette.overlay0 }}>
                      {FREQ_LABELS[s.frequency] || s.frequency} à {s.hour}h
                      {s.recipients && ` · ${s.recipients.split(/[;,]/).length} destinataire(s)`}
                      {s.lastRunAt && ` · Dernier : ${new Date(s.lastRunAt).toLocaleDateString('fr-FR')}`}
                      {s.nextRun && ` · Prochain : ${new Date(s.nextRun).toLocaleString('fr-FR')}`}
                    </Typography>
                  }
                />
                <ListItemSecondaryAction>
                  <Tooltip title={s.active ? 'Désactiver' : 'Activer'}>
                    <IconButton size="small" onClick={() => handleToggleSchedule(s.id)}
                      sx={{ color: s.active ? palette.green : palette.overlay0 }}>
                      {s.active ? <ToggleOn /> : <ToggleOff />}
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Supprimer">
                    <IconButton size="small" onClick={() => handleDeleteSchedule(s.id)}
                      sx={{ color: palette.red }}>
                      <Delete />
                    </IconButton>
                  </Tooltip>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        )}

        {showNewScheduleForm ? (
          <Box sx={{ p: 2, bgcolor: palette.surface0, borderRadius: 1, border: `1px solid ${palette.surface1}` }}>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1.5 }}>Nouveau planning</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField label="Nom" value={newSchedule.name}
                  onChange={(e) => setNewSchedule((p) => ({ ...p, name: e.target.value }))}
                  fullWidth size="small" placeholder="Rapport hebdomadaire production" />
              </Grid>
              <Grid item xs={5}>
                <TextField select label="Fréquence" value={newSchedule.frequency}
                  onChange={(e) => setNewSchedule((p) => ({ ...p, frequency: e.target.value }))}
                  fullWidth size="small" SelectProps={{ native: true }}>
                  <option value="daily">Quotidien</option>
                  <option value="weekly">Hebdomadaire (lundi)</option>
                  <option value="monthly">Mensuel (1er du mois)</option>
                </TextField>
              </Grid>
              <Grid item xs={3}>
                <TextField label="Heure" value={newSchedule.hour}
                  onChange={(e) => setNewSchedule((p) => ({ ...p, hour: e.target.value }))}
                  fullWidth size="small" placeholder="08" />
              </Grid>
              <Grid item xs={4}>
                <TextField label="Formats (pdf,excel…)" value={newSchedule.formats}
                  onChange={(e) => setNewSchedule((p) => ({ ...p, formats: e.target.value }))}
                  fullWidth size="small" placeholder="pdf,excel" />
              </Grid>
              <Grid item xs={12}>
                <TextField label="Destinataires (séparés par ;)" value={newSchedule.recipients}
                  onChange={(e) => setNewSchedule((p) => ({ ...p, recipients: e.target.value }))}
                  fullWidth size="small" placeholder="chef@projet.com ; equipe@test.com" />
              </Grid>
            </Grid>
            <Alert severity="info" sx={{ mt: 1.5, fontSize: '0.78rem' }}>
              Le plan de test sera celui actuellement analysé dans le tableau de bord au moment de l'exécution.
            </Alert>
            <Box sx={{ mt: 1.5, display: 'flex', gap: 1 }}>
              <Button variant="contained" size="small" onClick={handleAddSchedule}
                disabled={!newSchedule.name || scheduleSaving}
                startIcon={scheduleSaving ? <CircularProgress size={14} /> : <Add />}>
                Créer
              </Button>
              <Button variant="outlined" size="small" onClick={() => setShowNewScheduleForm(false)}
                startIcon={<Close />}>
                Annuler
              </Button>
            </Box>
          </Box>
        ) : (
          <Button variant="outlined" size="small" startIcon={<Add />}
            onClick={() => setShowNewScheduleForm(true)}>
            Ajouter un planning
          </Button>
        )}
      </Section>

      {/* ─── Template personnalisable ─────────────────────────────────── */}
      <Section icon={<Palette />} title="Personnalisation des rapports">
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField label="Nom de l'organisation" value={template.orgName}
              onChange={(e) => setTemplate((p) => ({ ...p, orgName: e.target.value }))}
              fullWidth size="small" placeholder="Ma Société SAS" />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Pied de page" value={template.footerText}
              onChange={(e) => setTemplate((p) => ({ ...p, footerText: e.target.value }))}
              fullWidth size="small" placeholder="Confidentiel — Usage interne" />
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography variant="caption" sx={{ color: palette.overlay0, display: 'block', mb: 0.5 }}>
              Couleur principale
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <input
                type="color"
                value={template.accentColor}
                onChange={(e) => setTemplate((p) => ({ ...p, accentColor: e.target.value }))}
                style={{
                  width: 40, height: 36, border: 'none', borderRadius: 4,
                  cursor: 'pointer', backgroundColor: 'transparent', padding: 2,
                }}
              />
              <Typography variant="body2" sx={{ fontFamily: 'monospace', color: palette.text }}>
                {template.accentColor}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={8}>
            <Typography variant="caption" sx={{ color: palette.overlay0, display: 'block', mb: 0.5 }}>
              Logo (PNG/JPG/SVG)
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Button variant="outlined" size="small" startIcon={<ImageIcon />} onClick={handleChooseLogo}>
                Choisir un logo
              </Button>
              {template.logoPath ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <CheckCircle sx={{ fontSize: 16, color: palette.green }} />
                  <Typography variant="caption" sx={{ color: palette.green }}>
                    {template.logoPath.split(/[/\\]/).pop()}
                  </Typography>
                  <IconButton size="small" onClick={() => setTemplate((p) => ({ ...p, logoPath: '' }))}
                    sx={{ color: palette.overlay0 }}>
                    <Close fontSize="small" />
                  </IconButton>
                </Box>
              ) : (
                <Typography variant="caption" sx={{ color: palette.overlay0 }}>Aucun logo sélectionné</Typography>
              )}
            </Box>
          </Grid>
        </Grid>
        <Box sx={{ mt: 2 }}>
          <Button variant="contained" size="small" onClick={handleSaveTemplate}
            disabled={templateSaving}
            startIcon={templateSaving ? <CircularProgress size={14} /> : <Save />}>
            Sauvegarder le template
          </Button>
        </Box>
      </Section>

      {/* ─── À propos ────────────────────────────────────────────────── */}
      <Section icon={<Info />} title="À propos de TFSReporter">
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {[
            ['Version', version],
            ['Stack', 'Electron 28 + React 18 + Material-UI 5'],
            ['Exports', 'PowerPoint (PptxGenJS) · HTML'],
            ['Email', 'Nodemailer · SMTP on-premise'],
            ['Planification', 'node-schedule'],
            ['Sécurité', 'PAT chiffré via electron.safeStorage (OS-level)'],
            ['Compatibilité', 'Azure DevOps Server 2019+ · Azure DevOps cloud'],
          ].map(([label, value]) => (
            <Box key={label} sx={{ display: 'flex', gap: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, color: palette.subtext0, minWidth: 130 }}>
                {label}
              </Typography>
              <Typography variant="body2" sx={{ color: palette.overlay1 }}>{value}</Typography>
            </Box>
          ))}
        </Box>
      </Section>
    </Box>
  )
}
