import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import ReceptionDashboard from './pages/ReceptionDashboard'
import QueueManagement from './pages/QueueManagement'
import AdminConsole from './pages/AdminConsole'
import TVDisplay from './pages/TVDisplay'
import Analytics from './pages/Analytics'
import { AuthProvider, useAuth } from './context/AuthContext'

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<ProtectedRoute><ReceptionDashboard /></ProtectedRoute>} />
          <Route path="/queue"     element={<ProtectedRoute><QueueManagement /></ProtectedRoute>} />
          <Route path="/admin"     element={<ProtectedRoute><AdminConsole /></ProtectedRoute>} />
          <Route path="/analytics"  element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
          <Route path="/tv"        element={<TVDisplay />} />
          <Route path="*"          element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
