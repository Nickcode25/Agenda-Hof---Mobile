import { useEffect, lazy, Suspense } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { App as CapacitorApp, URLOpenListenerEvent } from '@capacitor/app'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { SubscriptionProvider, useSubscription } from '@/contexts/SubscriptionContext'
import { NotificationProvider } from '@/contexts/NotificationContext'
import { BottomNav } from '@/components/layout/BottomNav'
import { Loading } from '@/components/ui/Loading'
import { useSwipeBack } from '@/hooks/useSwipeBack'

// Lazy load all pages for code splitting
const LoginPage = lazy(() => import('@/pages/Login').then(m => ({ default: m.LoginPage })))
const RegisterPage = lazy(() => import('@/pages/Register').then(m => ({ default: m.RegisterPage })))
const ForgotPasswordPage = lazy(() => import('@/pages/ForgotPassword').then(m => ({ default: m.ForgotPasswordPage })))
const ResetPasswordPage = lazy(() => import('@/pages/ResetPassword').then(m => ({ default: m.ResetPasswordPage })))

// Main app pages - lazy loaded
const AgendaPage = lazy(() => import('@/pages/Agenda').then(m => ({ default: m.AgendaPage })))
const PatientsPage = lazy(() => import('@/pages/Patients').then(m => ({ default: m.PatientsPage })))
const SettingsPage = lazy(() => import('@/pages/Settings').then(m => ({ default: m.SettingsPage })))

// Patient management - lazy loaded
const PatientDetailsPage = lazy(() => import('@/pages/PatientDetails').then(m => ({ default: m.PatientDetailsPage })))
const NewPatientPage = lazy(() => import('@/pages/NewPatient').then(m => ({ default: m.NewPatientPage })))
const EditPatientPage = lazy(() => import('@/pages/EditPatient').then(m => ({ default: m.EditPatientPage })))
const ImportContactsPage = lazy(() => import('@/pages/ImportContacts').then(m => ({ default: m.ImportContactsPage })))

// Appointment - lazy loaded
const NewAppointmentPage = lazy(() => import('@/pages/NewAppointment').then(m => ({ default: m.NewAppointmentPage })))

// Subscription & Payment - lazy loaded
const PlansPage = lazy(() => import('@/pages/Plans').then(m => ({ default: m.PlansPage })))
const SelectPlanPage = lazy(() => import('@/pages/SelectPlan').then(m => ({ default: m.SelectPlanPage })))
const CheckoutPage = lazy(() => import('@/pages/Checkout').then(m => ({ default: m.CheckoutPage })))
const MySubscriptionPage = lazy(() => import('@/pages/MySubscription').then(m => ({ default: m.MySubscriptionPage })))
const PaymentHistoryPage = lazy(() => import('@/pages/PaymentHistory').then(m => ({ default: m.PaymentHistoryPage })))
const SubscriptionBlockedPage = lazy(() => import('@/pages/SubscriptionBlocked').then(m => ({ default: m.SubscriptionBlockedPage })))

// Other - lazy loaded
const NotificationsPage = lazy(() => import('@/pages/Notifications').then(m => ({ default: m.NotificationsPage })))
const ProfilePage = lazy(() => import('@/pages/Profile').then(m => ({ default: m.ProfilePage })))

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

  // Habilitar swipe back para voltar à página anterior
  useSwipeBack()

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
      <Suspense fallback={<Loading fullScreen text="Carregando..." />}>
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
        <Route
          path="/payment-history"
          element={
            <ProtectedRoute>
              <PaymentHistoryPage />
            </ProtectedRoute>
          }
        />
          <Route path="*" element={<Navigate to="/agenda" replace />} />
        </Routes>
      </Suspense>

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
