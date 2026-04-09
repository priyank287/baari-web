import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import ReceptionDashboard from './pages/ReceptionDashboard'
import QueueManagement from './pages/QueueManagement'
import AdminConsole from './pages/AdminConsole'
import TVDisplay from './pages/TVDisplay'
import { QueueProvider } from './context/QueueContext'

export default function App() {
  return (
    <QueueProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<ReceptionDashboard />} />
        <Route path="/queue" element={<QueueManagement />} />
        <Route path="/admin" element={<AdminConsole />} />
        <Route path="/tv" element={<TVDisplay />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
    </QueueProvider>
  )
}
