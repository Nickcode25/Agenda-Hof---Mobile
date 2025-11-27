import { useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { App as CapacitorApp, URLOpenListenerEvent } from '@capacitor/app'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { SubscriptionProvider, useSubscription } from '@/contexts/SubscriptionContext'
import { NotificationProvider } from '@/contexts/NotificationContext'
import { BottomNav } from '@/components/layout/BottomNav'
import { Loading } from '@/components/ui/Loading'
import { LoginPage } from '@/pages/Login'
import { AgendaPage } from '@/pages/Agenda'
import { PatientsPage } from '@/pages/Patients'
import { PatientDetailsPage } from '@/pages/PatientDetails'
import { NewPatientPage } from '@/pages/NewPatient'
import { EditPatientPage } from '@/pages/EditPatient'
import { NewAppointmentPage } from '@/pages/NewAppointment'
import { SettingsPage } from '@/pages/Settings'
import { PlansPage } from '@/pages/Plans'
import { SubscriptionBlockedPage } from '@/pages/SubscriptionBlocked'
import { ImportContactsPage } from '@/pages/ImportContacts'
import { ForgotPasswordPage } from '@/pages/ForgotPassword'
import { ResetPasswordPage } from '@/pages/ResetPassword'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <Loading fullScreen text="Carregando..." />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

// Rota que requer assinatura ativa
function SubscriptionRequiredRoute({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const { isActive, loading: subLoading } = useSubscription()

  if (authLoading || subLoading) {
    return <Loading fullScreen text="Carregando..." />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!isActive) {
    return <Navigate to="/subscription-blocked" replace />
  }

  return <>{children}</>
}

function AppRoutes() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  // Deep Links handler
  useEffect(() => {
    const handleAppUrlOpen = (event: URLOpenListenerEvent) => {
      const url = new URL(event.url)
      const path = url.pathname + url.search + url.hash

      // Se for um link de reset de senha, navega para a página
      if (path.includes('reset-password') || url.hash.includes('access_token')) {
        navigate('/reset-password' + url.hash)
      }
    }

    CapacitorApp.addListener('appUrlOpen', handleAppUrlOpen)

    return () => {
      CapacitorApp.removeAllListeners()
    }
  }, [navigate])

  if (loading) {
    return <Loading fullScreen text="Carregando..." />
  }

  return (
    <>
      <Routes>
        <Route
          path="/login"
          element={user ? <Navigate to="/agenda" replace /> : <LoginPage />}
        />
        <Route
          path="/forgot-password"
          element={user ? <Navigate to="/agenda" replace /> : <ForgotPasswordPage />}
        />
        <Route
          path="/reset-password"
          element={<ResetPasswordPage />}
        />
        <Route
          path="/"
          element={<Navigate to="/agenda" replace />}
        />
        <Route
          path="/agenda"
          element={
            <SubscriptionRequiredRoute>
              <AgendaPage />
            </SubscriptionRequiredRoute>
          }
        />
        <Route
          path="/patients"
          element={
            <SubscriptionRequiredRoute>
              <PatientsPage />
            </SubscriptionRequiredRoute>
          }
        />
        <Route
          path="/patient/new"
          element={
            <SubscriptionRequiredRoute>
              <NewPatientPage />
            </SubscriptionRequiredRoute>
          }
        />
        <Route
          path="/patient/:id"
          element={
            <SubscriptionRequiredRoute>
              <PatientDetailsPage />
            </SubscriptionRequiredRoute>
          }
        />
        <Route
          path="/patient/:id/edit"
          element={
            <SubscriptionRequiredRoute>
              <EditPatientPage />
            </SubscriptionRequiredRoute>
          }
        />
        <Route
          path="/appointment/new"
          element={
            <SubscriptionRequiredRoute>
              <NewAppointmentPage />
            </SubscriptionRequiredRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/plans"
          element={
            <ProtectedRoute>
              <PlansPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/subscription-blocked"
          element={
            <ProtectedRoute>
              <SubscriptionBlockedPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/import-contacts"
          element={
            <SubscriptionRequiredRoute>
              <ImportContactsPage />
            </SubscriptionRequiredRoute>
          }
        />
        <Route path="*" element={<Navigate to="/agenda" replace />} />
      </Routes>

      {user && <BottomNav />}
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <SubscriptionProvider>
        <NotificationProvider>
          <AppRoutes />
        </NotificationProvider>
      </SubscriptionProvider>
    </AuthProvider>
  )
}
