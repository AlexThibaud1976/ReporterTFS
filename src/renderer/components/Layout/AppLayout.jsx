import React, { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  Box, Drawer, List, ListItemButton, ListItemIcon, ListItemText,
  Typography, Divider, Tooltip, IconButton, Chip, Avatar,
} from '@mui/material'
import {
  Dashboard as DashboardIcon,
  Description as ReportIcon,
  CompareArrows as CompareIcon,
  History as HistoryIcon,
  Settings as SettingsIcon,
  PowerSettingsNew as DisconnectIcon,
  ChevronLeft as CollapseIcon,
  ChevronRight as ExpandIcon,
} from '@mui/icons-material'
import { useAuthStore } from '../../store/authStore'
import { palette } from '../../theme/theme'

const DRAWER_WIDTH = 220
const DRAWER_COLLAPSED = 64

const navItems = [
  { path: '/dashboard', label: 'Tableau de bord', icon: <DashboardIcon fontSize="small" /> },
  { path: '/report', label: 'Nouveau rapport', icon: <ReportIcon fontSize="small" /> },
  { path: '/comparison', label: 'Comparer plans', icon: <CompareIcon fontSize="small" /> },
  { path: '/history', label: 'Historique', icon: <HistoryIcon fontSize="small" /> },
]

export default function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { activeConnection, disconnect } = useAuthStore()
  const [collapsed, setCollapsed] = useState(false)

  const drawerWidth = collapsed ? DRAWER_COLLAPSED : DRAWER_WIDTH

  const handleDisconnect = async () => {
    await disconnect()
    navigate('/connect')
  }

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* ─── Sidebar ────────────────────────────────────────────────────────── */}
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            backgroundColor: palette.mantle,
            borderRight: `1px solid ${palette.surface0}`,
            transition: 'width 0.2s ease',
            overflow: 'hidden',
          },
        }}
      >
        {/* Logo / Header */}
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5, minHeight: 64 }}>
          <Box
            sx={{
              width: 32, height: 32, borderRadius: 1.5,
              background: `linear-gradient(135deg, ${palette.blue}, ${palette.mauve})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: 14, color: palette.base, flexShrink: 0,
            }}
          >
            TFS
          </Box>
          {!collapsed && (
            <Typography variant="h5" sx={{ color: palette.text, fontWeight: 700, fontSize: '1rem' }}>
              TFSReporter
            </Typography>
          )}
        </Box>

        <Divider sx={{ borderColor: palette.surface0 }} />

        {/* Navigation principale */}
        <List sx={{ px: 1, py: 1, flexGrow: 1 }}>
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path)
            return (
              <Tooltip key={item.path} title={collapsed ? item.label : ''} placement="right">
                <ListItemButton
                  selected={isActive}
                  onClick={() => navigate(item.path)}
                  sx={{ mb: 0.5, px: collapsed ? 1.5 : 2, justifyContent: collapsed ? 'center' : 'flex-start' }}
                >
                  <ListItemIcon sx={{ minWidth: collapsed ? 0 : 36, color: isActive ? palette.blue : palette.overlay1 }}>
                    {item.icon}
                  </ListItemIcon>
                  {!collapsed && (
                    <ListItemText
                      primary={item.label}
                      primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: isActive ? 600 : 400 }}
                    />
                  )}
                </ListItemButton>
              </Tooltip>
            )
          })}
        </List>

        <Divider sx={{ borderColor: palette.surface0 }} />

        {/* Connexion active */}
        {!collapsed && activeConnection && (
          <Box sx={{ px: 2, py: 1.5 }}>
            <Typography variant="caption" sx={{ color: palette.overlay0, display: 'block', mb: 0.5 }}>
              CONNEXION ACTIVE
            </Typography>
            <Typography variant="body2" sx={{ color: palette.text, fontWeight: 500, fontSize: '0.8rem' }} noWrap>
              {activeConnection.name}
            </Typography>
            <Typography variant="caption" sx={{ color: palette.overlay0 }} noWrap>
              {activeConnection.serverUrl}
            </Typography>
          </Box>
        )}

        {/* Settings & Déconnexion */}
        <List sx={{ px: 1, pb: 1 }}>
          <Tooltip title={collapsed ? 'Paramètres' : ''} placement="right">
            <ListItemButton
              selected={location.pathname === '/settings'}
              onClick={() => navigate('/settings')}
              sx={{ px: collapsed ? 1.5 : 2, justifyContent: collapsed ? 'center' : 'flex-start' }}
            >
              <ListItemIcon sx={{ minWidth: collapsed ? 0 : 36, color: palette.overlay1 }}>
                <SettingsIcon fontSize="small" />
              </ListItemIcon>
              {!collapsed && <ListItemText primary="Paramètres" primaryTypographyProps={{ fontSize: '0.875rem' }} />}
            </ListItemButton>
          </Tooltip>

          <Tooltip title={collapsed ? 'Déconnecter' : ''} placement="right">
            <ListItemButton
              onClick={handleDisconnect}
              sx={{ px: collapsed ? 1.5 : 2, justifyContent: collapsed ? 'center' : 'flex-start', color: palette.red }}
            >
              <ListItemIcon sx={{ minWidth: collapsed ? 0 : 36, color: palette.red }}>
                <DisconnectIcon fontSize="small" />
              </ListItemIcon>
              {!collapsed && <ListItemText primary="Déconnecter" primaryTypographyProps={{ fontSize: '0.875rem', color: palette.red }} />}
            </ListItemButton>
          </Tooltip>
        </List>

        {/* Bouton collapse */}
        <Box sx={{ p: 1, display: 'flex', justifyContent: collapsed ? 'center' : 'flex-end' }}>
          <IconButton size="small" onClick={() => setCollapsed(!collapsed)} sx={{ color: palette.overlay0 }}>
            {collapsed ? <ExpandIcon fontSize="small" /> : <CollapseIcon fontSize="small" />}
          </IconButton>
        </Box>
      </Drawer>

      {/* ─── Contenu principal ──────────────────────────────────────────────── */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          overflow: 'auto',
          backgroundColor: palette.base,
          height: '100vh',
        }}
      >
        <Outlet />
      </Box>
    </Box>
  )
}
