import { useEffect, lazy, Suspense, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
// Deep links temporariamente desabilitado - ver comentário no AppRoutes
// import { App as CapacitorApp, URLOpenListenerEvent } from '@capacitor/app'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { SubscriptionProvider, useSubscription } from '@/contexts/SubscriptionContext'
import { NotificationProvider } from '@/contexts/NotificationContext'
import { NavigationProvider } from '@/contexts/NavigationContext'
import { BottomNav } from '@/components/layout/BottomNav'
import { Loading } from '@/components/ui/Loading'
import { BiometricPrompt } from '@/components/BiometricPrompt'
import { useSwipeBack } from '@/hooks/useSwipeBack'
import { useBiometricAuth } from '@/hooks/useBiometricAuth'

// Lazy load all pages for code splitting
const LoginPage = lazy(() => import('@/pages/Login').then(m => ({ default: m.LoginPage })))
const RegisterPage = lazy(() => import('@/pages/Register').then(m => ({ default: m.RegisterPage })))
const ForgotPasswordPage = lazy(() => import('@/pages/ForgotPassword').then(m => ({ default: m.ForgotPasswordPage })))
const ResetPasswordPage = lazy(() => import('@/pages/ResetPassword').then(m => ({ default: m.ResetPasswordPage })))
const BiometricLoginPage = lazy(() => import('@/pages/BiometricLogin').then(m => ({ default: m.BiometricLoginPage })))

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

// Subscription pages - lazy loaded (no payment pages - payments handled on website)
const PlansPage = lazy(() => import('@/pages/Plans').then(m => ({ default: m.PlansPage })))
const MySubscriptionPage = lazy(() => import('@/pages/MySubscription').then(m => ({ default: m.MySubscriptionPage })))
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
  const {
    user,
    loading,
    biometricEnabled,
    biometricCheckComplete,
    showBiometricPrompt,
    signIn,
    enableBiometricForCurrentUser,
    dismissBiometricPrompt,
  } = useAuth()
  const { biometryType, biometryAvailable } = useBiometricAuth()
  // const navigate = useNavigate() // Desabilitado - deep links temporariamente desabilitado

  // State to track if user chose to use password instead of biometric
  const [usePasswordLogin, setUsePasswordLogin] = useState(false)

  // Habilitar swipe back para voltar à página anterior
  useSwipeBack()

  // Deep Links handler - desabilitado temporariamente para debug
  // TODO: Reativar após resolver crash do WebView
  /*
  useEffect(() => {
    let listenerHandle: { remove: () => Promise<void> } | null = null

    const setupDeepLinkListener = async () => {
      const handleAppUrlOpen = (event: URLOpenListenerEvent) => {
        const url = new URL(event.url)
        const path = url.pathname + url.search + url.hash

        // Se for um link de reset de senha, navega para a página
        if (path.includes('reset-password') || url.hash.includes('access_token')) {
          navigate('/reset-password' + url.hash)
        }
      }

      listenerHandle = await CapacitorApp.addListener('appUrlOpen', handleAppUrlOpen)
    }

    setupDeepLinkListener()

    return () => {
      if (listenerHandle) {
        listenerHandle.remove().catch(() => {})
      }
    }
  }, [navigate])
  */

  // Reset usePasswordLogin when user logs in
  useEffect(() => {
    if (user) {
      setUsePasswordLogin(false)
    }
  }, [user])

  if (loading || !biometricCheckComplete) {
    return <Loading fullScreen text="Carregando..." />
  }

  // Show biometric login screen if:
  // - User is not logged in
  // - Biometric is enabled
  // - User hasn't chosen to use password login
  const shouldShowBiometricLogin = !user && biometricEnabled && !usePasswordLogin

  // Handler for biometric authentication
  const handleBiometricAuthenticate = async (email: string, password: string): Promise<boolean> => {
    const { error } = await signIn(email, password)
    return !error
  }

  // Handler for enabling biometric after login
  const handleEnableBiometric = async () => {
    await enableBiometricForCurrentUser()
  }

  return (
    <>
      <Suspense fallback={<Loading fullScreen text="Carregando..." />}>
        {shouldShowBiometricLogin ? (
          <BiometricLoginPage
            onAuthenticate={handleBiometricAuthenticate}
            onUsePassword={() => setUsePasswordLogin(true)}
          />
        ) : (
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
            <Route path="*" element={<Navigate to="/agenda" replace />} />
          </Routes>
        )}
      </Suspense>

      {user && <BottomNav />}

      {/* Biometric Prompt Modal - shown after first successful login */}
      {biometryAvailable && (
        <BiometricPrompt
          isOpen={showBiometricPrompt}
          biometryType={biometryType}
          onEnable={handleEnableBiometric}
          onSkip={dismissBiometricPrompt}
        />
      )}
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <SubscriptionProvider>
        <NavigationProvider>
          <NotificationProvider>
            <AppRoutes />
          </NotificationProvider>
        </NavigationProvider>
      </SubscriptionProvider>
    </AuthProvider>
  )
}
