import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useSubscription } from '@/contexts/SubscriptionContext'
import { Avatar } from '@/components/ui/Avatar'
import { ChevronRight, Bell, Crown } from 'lucide-react'

export function SettingsPage() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const { planName } = useSubscription()
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const handleSignOut = async () => {
    setLoggingOut(true)
    await signOut()
    setLoggingOut(false)
    setShowLogoutModal(false)
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
                  Você precisará fazer login novamente
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
