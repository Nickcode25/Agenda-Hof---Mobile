import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useSubscription } from '@/contexts/SubscriptionContext'
import { useBiometricAuth } from '@/hooks/useBiometricAuth'
import { Avatar } from '@/components/ui/Avatar'
import { ChevronRight, Bell, Crown, Shield } from 'lucide-react'
import { useStatusBar } from '@/hooks/useStatusBar'

// Face ID icon
const FaceIdIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
    <path d="M7 3H5a2 2 0 00-2 2v2M17 3h2a2 2 0 012 2v2M7 21H5a2 2 0 01-2-2v-2M17 21h2a2 2 0 002-2v-2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9 9v1.5M15 9v1.5" strokeLinecap="round" />
    <path d="M12 12v2" strokeLinecap="round" />
    <path d="M8.5 16c.5 1 1.5 1.5 3.5 1.5s3-.5 3.5-1.5" strokeLinecap="round" />
  </svg>
)

// Touch ID icon (fingerprint)
const TouchIdIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
    <path d="M12 2a10 10 0 0110 10c0 1.5-.5 3-1 4.5" strokeLinecap="round" />
    <path d="M2 12a10 10 0 0118-6" strokeLinecap="round" />
    <path d="M12 6a6 6 0 016 6c0 1-.2 2-.5 3" strokeLinecap="round" />
    <path d="M6 12a6 6 0 018.5-5.5" strokeLinecap="round" />
    <path d="M12 10a2 2 0 012 2v4" strokeLinecap="round" />
    <path d="M12 22v-8" strokeLinecap="round" />
  </svg>
)

export function SettingsPage() {
  const navigate = useNavigate()
  const { user, signOut, biometricEnabled, disableBiometric } = useAuth()
  const { planName } = useSubscription()
  const { biometryAvailable, biometryType } = useBiometricAuth()
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [togglingBiometric, setTogglingBiometric] = useState(false)

  // Status bar com icones pretos (fundo claro)
  useStatusBar('light')

  const handleSignOut = async () => {
    setLoggingOut(true)
    await signOut()
    setLoggingOut(false)
    setShowLogoutModal(false)
  }

  const handleBiometricToggle = async () => {
    if (togglingBiometric) return

    setTogglingBiometric(true)
    try {
      if (biometricEnabled) {
        await disableBiometric()
      } else {
        // For enabling, we need email and password - redirect to a flow
        // Since we don't have the password stored, user needs to re-authenticate
        // For now, show a message
        alert('Para ativar a biometria, faça logout e login novamente. O app perguntará se deseja ativar.')
      }
    } catch (error) {
      console.error('Error toggling biometric:', error)
    } finally {
      setTogglingBiometric(false)
    }
  }

  const getBiometricIcon = () => {
    if (!biometryType) return <Shield className="w-[17px] h-[17px] text-white" />

    switch (biometryType.icon) {
      case 'faceid':
        return <FaceIdIcon className="w-[17px] h-[17px] text-white" />
      case 'touchid':
        return <TouchIdIcon className="w-[17px] h-[17px] text-white" />
      default:
        return <Shield className="w-[17px] h-[17px] text-white" />
    }
  }

  const getBiometricName = () => {
    return biometryType?.name || 'Face ID / Touch ID'
  }

  return (
    <div className="min-h-screen bg-[#f2f2f7] pb-20">
      {/* Safe area top com cor de fundo */}
      <div className="h-safe-top bg-[#f2f2f7]" />
      {/* iOS Large Title Header */}
      <div className="bg-[#f2f2f7]">
        <div className="px-4 pt-2 pb-2">
          <h1 className="text-[34px] font-bold text-surface-900 tracking-tight">
            Ajustes
          </h1>
        </div>
      </div>

      {/* Profile Card - iOS Style */}
      <div className="px-4 pt-2 pb-6">
        <button
          onClick={() => navigate('/profile')}
          className="w-full ios-list p-4 active:opacity-80 transition-opacity"
        >
          <div className="flex items-center gap-3">
            <Avatar name={user?.user_metadata?.full_name || user?.email || 'Usuário'} size="lg" />
            <div className="flex-1 text-left min-w-0">
              <h2 className="font-semibold text-surface-900 text-[17px] truncate">
                {user?.user_metadata?.full_name || 'Usuário'}
              </h2>
              <p className="text-surface-500 text-[13px] truncate">
                Perfil, Conta e mais
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-[#c7c7cc] flex-shrink-0" />
          </div>
        </button>
      </div>

      {/* Settings Groups */}
      <div className="px-4 space-y-6">
        {/* Main Settings */}
        <div>
          <div className="ios-list">
            <button
              onClick={() => navigate('/my-subscription')}
              className="ios-list-item w-full"
            >
              <div className="flex items-center gap-3 flex-1">
                <div className="w-[29px] h-[29px] bg-gradient-to-br from-amber-400 to-orange-500 rounded-[6px] flex items-center justify-center">
                  <Crown className="w-[17px] h-[17px] text-white" />
                </div>
                <div className="flex-1 text-left">
                  <span className="text-[17px] text-surface-900">Assinatura</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[15px] text-[#8e8e93]">{planName}</span>
                <ChevronRight className="w-5 h-5 text-[#c7c7cc]" />
              </div>
            </button>

            <button
              onClick={() => navigate('/notifications')}
              className="ios-list-item w-full"
            >
              <div className="flex items-center gap-3 flex-1">
                <div className="w-[29px] h-[29px] bg-gradient-to-br from-red-400 to-red-500 rounded-[6px] flex items-center justify-center">
                  <Bell className="w-[17px] h-[17px] text-white" />
                </div>
                <span className="text-[17px] text-surface-900">Notificações</span>
              </div>
              <ChevronRight className="w-5 h-5 text-[#c7c7cc]" />
            </button>
          </div>
        </div>

        {/* Security Settings */}
        {biometryAvailable && (
          <div>
            <p className="text-[13px] font-normal text-[#8e8e93] uppercase tracking-wide px-4 pb-2">
              Segurança
            </p>
            <div className="ios-list">
              <div className="ios-list-item">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-[29px] h-[29px] bg-gradient-to-br from-green-400 to-green-500 rounded-[6px] flex items-center justify-center">
                    {getBiometricIcon()}
                  </div>
                  <div className="flex-1">
                    <span className="text-[17px] text-surface-900">{getBiometricName()}</span>
                    <p className="text-[13px] text-[#8e8e93] mt-0.5">
                      {biometricEnabled ? 'Ativado' : 'Desativado'}
                    </p>
                  </div>
                </div>
                {/* iOS Toggle Switch */}
                <button
                  onClick={handleBiometricToggle}
                  disabled={togglingBiometric}
                  className={`relative w-[51px] h-[31px] rounded-full transition-colors duration-200 ${
                    biometricEnabled ? 'bg-green-500' : 'bg-[#e5e5ea]'
                  } ${togglingBiometric ? 'opacity-50' : ''}`}
                >
                  <div
                    className={`absolute top-[2px] w-[27px] h-[27px] bg-white rounded-full shadow-sm transition-transform duration-200 ${
                      biometricEnabled ? 'translate-x-[22px]' : 'translate-x-[2px]'
                    }`}
                  />
                </button>
              </div>
            </div>
            <p className="text-[13px] text-[#8e8e93] px-4 pt-2">
              Use {getBiometricName()} para desbloquear o app rapidamente.
            </p>
          </div>
        )}

        {/* Logout */}
        <div>
          <div className="ios-list">
            <button
              onClick={() => setShowLogoutModal(true)}
              className="ios-list-item w-full justify-center"
            >
              <span className="text-[17px] text-red-500">Sair da Conta</span>
            </button>
          </div>
        </div>

        {/* Version */}
        <p className="text-center text-[13px] text-[#8e8e93] pt-2">
          Agenda HOF v1.0.0
        </p>
      </div>

      {/* Logout Modal - iOS Action Sheet Style */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center p-2 pb-safe-bottom">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowLogoutModal(false)}
          />

          {/* Action Sheet */}
          <div className="relative w-full max-w-[400px] space-y-2 animate-slide-up">
            {/* Main Card */}
            <div className="bg-white/95 backdrop-blur-xl rounded-[14px] overflow-hidden">
              <div className="p-4 text-center border-b border-surface-200/50">
                <h3 className="text-[13px] font-semibold text-[#8e8e93] uppercase">
                  Sair da conta?
                </h3>
                <p className="text-[13px] text-[#8e8e93] mt-1">
                  {biometricEnabled
                    ? 'A biometria será desativada e você precisará fazer login novamente'
                    : 'Você precisará fazer login novamente'}
                </p>
              </div>
              <button
                onClick={handleSignOut}
                disabled={loggingOut}
                className="w-full py-[18px] text-[20px] text-red-500 font-normal active:bg-surface-100 disabled:opacity-50"
              >
                {loggingOut ? 'Saindo...' : 'Sair'}
              </button>
            </div>

            {/* Cancel Button */}
            <button
              onClick={() => setShowLogoutModal(false)}
              className="w-full py-[18px] text-[20px] text-primary-500 font-semibold bg-white rounded-[14px] active:bg-surface-100"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
