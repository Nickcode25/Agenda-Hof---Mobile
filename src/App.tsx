import { useEffect, useState } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { App as CapacitorApp, URLOpenListenerEvent } from '@capacitor/app'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { SubscriptionProvider, useSubscription } from '@/contexts/SubscriptionContext'
import { NotificationProvider, useNotifications } from '@/contexts/NotificationContext'
import { BottomNav } from '@/components/layout/BottomNav'
import {
  NotificationPermissionModal,
  shouldShowNotificationModal,
} from '@/components/NotificationPermissionModal'
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
import { RegisterPage } from '@/pages/Register'
import { NotificationsPage } from '@/pages/Notifications'
import { ProfilePage } from '@/pages/Profile'
import { MySubscriptionPage } from '@/pages/MySubscription'
import { SelectPlanPage } from '@/pages/SelectPlan'
import { CheckoutPage } from '@/pages/Checkout'

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
  const { refreshNotificationStatus, scheduleRemindersForToday } = useNotifications()
  const navigate = useNavigate()
  const [showNotificationModal, setShowNotificationModal] = useState(false)

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

  // Verifica se deve mostrar modal de permissão após login
  useEffect(() => {
    if (user && !loading) {
      // Pequeno delay para garantir que a UI carregou
      const timer = setTimeout(() => {
        if (shouldShowNotificationModal()) {
          setShowNotificationModal(true)
        }
      }, 500)

      return () => clearTimeout(timer)
    }
  }, [user, loading])

  const handleNotificationPermissionGranted = () => {
    refreshNotificationStatus()
    scheduleRemindersForToday()
  }

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
          path="/register"
          element={user ? <Navigate to="/agenda" replace /> : <RegisterPage />}
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
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <NotificationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-subscription"
          element={
            <ProtectedRoute>
              <MySubscriptionPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/select-plan"
          element={
            <ProtectedRoute>
              <SelectPlanPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/checkout"
          element={
            <ProtectedRoute>
              <CheckoutPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/agenda" replace />} />
      </Routes>

      {user && <BottomNav />}

      {/* Modal de permissão de notificações */}
      {showNotificationModal && (
        <NotificationPermissionModal
          onClose={() => setShowNotificationModal(false)}
          onPermissionGranted={handleNotificationPermissionGranted}
        />
      )}
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
