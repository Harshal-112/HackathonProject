import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/lib/auth-context'
import { ThemeProvider } from '@/lib/theme-context'
import { ToastProvider } from '@/lib/toast-context'
import { ProtectedRoute } from '@/components/layout/protected-route'
import { Layout } from '@/components/layout/layout'
import LoginPage from '@/pages/login'
import RegisterPage from '@/pages/register'
import ForgotPasswordPage from '@/pages/forgot-password'
import DashboardPage from '@/pages/dashboard'
import UploadPage from '@/pages/upload'
import DocumentListPage from '@/pages/document-list'
import DocumentDetailsPage from '@/pages/document-details'
import SearchPage from '@/pages/search'
import ApprovalsPage from '@/pages/approvals'
import AuditTrailPage from '@/pages/audit-trail'
import ReportsPage from '@/pages/reports'
import UsersPage from '@/pages/users'
import SettingsPage from '@/pages/settings'
import ProfilePage from '@/pages/profile'
import NotFoundPage from '@/pages/not-found'

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />

            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/upload" element={<UploadPage />} />
              <Route path="/documents" element={<DocumentListPage />} />
              <Route path="/documents/:id" element={<DocumentDetailsPage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/approvals" element={<ProtectedRoute roles={['admin', 'officer', 'verifier']}><ApprovalsPage /></ProtectedRoute>} />
              <Route path="/audit" element={<ProtectedRoute roles={['admin', 'officer', 'verifier']}><AuditTrailPage /></ProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute roles={['admin', 'officer', 'verifier']}><ReportsPage /></ProtectedRoute>} />
              <Route path="/users" element={<ProtectedRoute roles={['admin']}><UsersPage /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute roles={['admin']}><SettingsPage /></ProtectedRoute>} />
              <Route path="/profile" element={<ProfilePage />} />
            </Route>

            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  )
}
