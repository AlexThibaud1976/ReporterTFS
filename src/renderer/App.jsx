import React, { useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { Box } from '@mui/material'
import { useAuthStore } from './store/authStore'

// Pages
import ConnectionPage from './pages/ConnectionPage'
import DashboardPage from './pages/DashboardPage'
import ReportBuilderPage from './pages/ReportBuilderPage'
import SettingsPage from './pages/SettingsPage'

// Layout
import AppLayout from './components/Layout/AppLayout'

/**
 * Guard de route : redirige vers /connect si non connecté
 */
function PrivateRoute({ children }) {
  const isConnected = useAuthStore((s) => s.isConnected)
  return isConnected ? children : <Navigate to="/connect" replace />
}

export default function App() {
  const { loadConnections } = useAuthStore()

  // Au démarrage : charger les connexions sauvegardées
  useEffect(() => {
    loadConnections()
  }, [])

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Routes>
        {/* Page de connexion (sans layout) */}
        <Route path="/connect" element={<ConnectionPage />} />

        {/* Pages protégées (avec layout sidebar) */}
        <Route
          path="/"
          element={
            <PrivateRoute>
              <AppLayout />
            </PrivateRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="report" element={<ReportBuilderPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Box>
  )
}
