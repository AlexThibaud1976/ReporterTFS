import React, { useState } from 'react'
import {
  Box, Typography, Card, CardContent, TextField, Button,
  Divider, Switch, FormControlLabel, Alert, Chip, Grid,
} from '@mui/material'
import { Save, Email, Schedule, Palette, Info } from '@mui/icons-material'
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

export default function SettingsPage() {
  const [smtp, setSmtp] = useState({ host: '', port: '587', user: '', password: '', from: '', tls: true })
  const [schedule, setSchedule] = useState({ enabled: false, frequency: 'weekly', hour: '08', recipients: '' })
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    // Phase 4 : sauvegarder via IPC
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <Box sx={{ p: 3, maxWidth: 720, height: '100%', overflow: 'auto' }}>
      <Typography variant="h2" sx={{ mb: 0.5 }}>Paramètres</Typography>
      <Typography variant="body2" sx={{ color: palette.overlay0, mb: 3 }}>
        Configuration SMTP, planification et personnalisation
      </Typography>

      {saved && <Alert severity="success" sx={{ mb: 2 }}>Paramètres sauvegardés ✓</Alert>}

      {/* ─── SMTP ────────────────────────────────────────────────────── */}
      <Section icon={<Email />} title="Envoi d'emails">
        <Alert severity="info" icon={<Info />} sx={{ mb: 2, fontSize: '0.8rem' }}>
          Configurez un serveur SMTP pour envoyer les rapports automatiquement par email.
        </Alert>
        <Grid container spacing={2}>
          <Grid item xs={8}>
            <TextField label="Serveur SMTP" value={smtp.host} onChange={e => setSmtp(p => ({ ...p, host: e.target.value }))}
              fullWidth size="small" placeholder="smtp.entreprise.com" />
          </Grid>
          <Grid item xs={4}>
            <TextField label="Port" value={smtp.port} onChange={e => setSmtp(p => ({ ...p, port: e.target.value }))}
              fullWidth size="small" />
          </Grid>
          <Grid item xs={6}>
            <TextField label="Utilisateur" value={smtp.user} onChange={e => setSmtp(p => ({ ...p, user: e.target.value }))}
              fullWidth size="small" placeholder="user@entreprise.com" />
          </Grid>
          <Grid item xs={6}>
            <TextField label="Mot de passe" type="password" value={smtp.password}
              onChange={e => setSmtp(p => ({ ...p, password: e.target.value }))} fullWidth size="small" />
          </Grid>
          <Grid item xs={8}>
            <TextField label="Adresse expéditeur" value={smtp.from}
              onChange={e => setSmtp(p => ({ ...p, from: e.target.value }))} fullWidth size="small" placeholder="tfsreporter@entreprise.com" />
          </Grid>
          <Grid item xs={4} sx={{ display: 'flex', alignItems: 'center' }}>
            <FormControlLabel
              control={<Switch checked={smtp.tls} onChange={e => setSmtp(p => ({ ...p, tls: e.target.checked }))} size="small" />}
              label={<Typography variant="body2">TLS/STARTTLS</Typography>}
            />
          </Grid>
        </Grid>

        <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
          <Button variant="outlined" size="small" disabled>Tester l'envoi (Phase 4)</Button>
        </Box>
      </Section>

      {/* ─── Planification ───────────────────────────────────────────── */}
      <Section icon={<Schedule />} title="Envoi automatique planifié">
        <Alert severity="info" icon={<Info />} sx={{ mb: 2, fontSize: '0.8rem' }}>
          Envoyez automatiquement les rapports à une fréquence définie.
        </Alert>
        <FormControlLabel
          control={<Switch checked={schedule.enabled} onChange={e => setSchedule(p => ({ ...p, enabled: e.target.checked }))} />}
          label="Activer l'envoi planifié"
          sx={{ mb: 2 }}
        />
        {schedule.enabled && (
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                select label="Fréquence" value={schedule.frequency}
                onChange={e => setSchedule(p => ({ ...p, frequency: e.target.value }))}
                fullWidth size="small" SelectProps={{ native: true }}
              >
                <option value="daily">Quotidien</option>
                <option value="weekly">Hebdomadaire (lundi)</option>
                <option value="monthly">Mensuel (1er du mois)</option>
              </TextField>
            </Grid>
            <Grid item xs={3}>
              <TextField label="Heure" value={schedule.hour}
                onChange={e => setSchedule(p => ({ ...p, hour: e.target.value }))}
                fullWidth size="small" placeholder="08" />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Destinataires (séparés par ;)" value={schedule.recipients}
                onChange={e => setSchedule(p => ({ ...p, recipients: e.target.value }))}
                fullWidth size="small" placeholder="chef@projet.com ; equipe@test.com" />
            </Grid>
          </Grid>
        )}
        <Box sx={{ mt: 1 }}>
          <Chip label="Disponible en Phase 4" size="small" sx={{ bgcolor: `${palette.peach}20`, color: palette.peach }} />
        </Box>
      </Section>

      {/* ─── À propos ────────────────────────────────────────────────── */}
      <Section icon={<Info />} title="À propos de TFSReporter">
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {[
            ['Version', '1.0.0 (Phase 1-3)'],
            ['Stack', 'Electron 28 + React 18 + Material-UI 5'],
            ['Exports', 'PDF (PDFKit) · Excel (ExcelJS) · PowerPoint (PptxGenJS) · HTML'],
            ['Sécurité', 'PAT chiffré via electron.safeStorage (OS-level)'],
            ['Compatibilité', 'Azure DevOps Server 2019+ · Azure DevOps cloud'],
          ].map(([label, value]) => (
            <Box key={label} sx={{ display: 'flex', gap: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, color: palette.subtext0, minWidth: 110 }}>{label}</Typography>
              <Typography variant="body2" sx={{ color: palette.overlay1 }}>{value}</Typography>
            </Box>
          ))}
        </Box>
      </Section>

      <Button variant="contained" startIcon={<Save />} onClick={handleSave} size="large">
        Sauvegarder les paramètres
      </Button>
    </Box>
  )
}
