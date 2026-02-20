import React, { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@store/authStore'
import DashboardPage from './pages/DashboardPage'
import ConnectionPage from './pages/ConnectionPage'

function PrivateRoute({ children }) {
  const isConnected = useAuthStore((s) => s.isConnected)
  return isConnected ? children : <Navigate to="/connect" replace />
}

export default function App() {
  const { loadConnections } = useAuthStore()
  useEffect(() => { loadConnections() }, [])

  return (
    <Routes>
      <Route path="/connect"   element={<ConnectionPage />} />
      <Route path="/dashboard" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
      <Route path="*"          element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
