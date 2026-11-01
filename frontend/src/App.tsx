import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import Navbar from './components/layout/Navbar'
import ProtectedRoute from './components/layout/ProtectedRoute'
import VoiceAssistant from './components/ai/VoiceAssistant'

// Pages
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import OAuthCallbackPage from './pages/auth/OAuthCallbackPage'
import DashboardPage from './pages/dashboard/DashboardPage'
import ResumeEditorPage from './pages/resume/ResumeEditorPage'
import AnalyzePage from './pages/resume/AnalyzePage'
import JobMatchPage from './pages/job-match/JobMatchPage'
import JobsPage from './pages/jobs/JobsPage'

export default function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1">
          <Routes>
            {/* Public */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/auth/callback" element={<OAuthCallbackPage />} />

            {/* Protected */}
            <Route
              path="/dashboard"
              element={<ProtectedRoute><DashboardPage /></ProtectedRoute>}
            />
            <Route
              path="/resumes/:id/edit"
              element={<ProtectedRoute><ResumeEditorPage /></ProtectedRoute>}
            />
            <Route
              path="/resumes/:id/analyze"
              element={<ProtectedRoute><AnalyzePage /></ProtectedRoute>}
            />
            <Route
              path="/job-match"
              element={<ProtectedRoute><JobMatchPage /></ProtectedRoute>}
            />
            <Route
              path="/job-match/:id"
              element={<ProtectedRoute><JobMatchPage /></ProtectedRoute>}
            />
            <Route
              path="/jobs"
              element={<ProtectedRoute><JobsPage /></ProtectedRoute>}
            />

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <VoiceAssistant />
      </div>
    </AuthProvider>
  )
}
