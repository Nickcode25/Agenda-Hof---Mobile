import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useSubscription } from '@/contexts/SubscriptionContext'
import { Header } from '@/components/layout/Header'
import { Avatar } from '@/components/ui/Avatar'
import { LogOut, ChevronRight, Bell, Crown } from 'lucide-react'

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
    <div className="min-h-screen bg-surface-50 pb-20">
      <Header title="Configurações" />

      {/* Profile Section */}
      <button
        onClick={() => navigate('/profile')}
        className="w-full bg-white px-4 py-5 border-b border-surface-100 active:bg-surface-50 transition-colors"
      >
        <div className="flex items-center gap-4">
          <Avatar name={user?.user_metadata?.name || user?.email || 'Usuário'} size="lg" />
          <div className="flex-1 text-left min-w-0">
            <h2 className="font-semibold text-surface-900 text-lg truncate">
              {user?.user_metadata?.name || 'Usuário'}
            </h2>
            <p className="text-surface-500 text-sm truncate">{user?.email}</p>
          </div>
          <ChevronRight className="w-5 h-5 text-surface-400 flex-shrink-0" />
        </div>
      </button>

      {/* Settings List */}
      <div className="px-4 py-4 space-y-4">
        <div className="card divide-y divide-surface-100 p-0 overflow-hidden">
          <button
            onClick={() => navigate('/my-subscription')}
            className="w-full flex items-center justify-between p-4 active:bg-surface-50"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center">
                <Crown className="w-5 h-5 text-primary-600" />
              </div>
              <div className="text-left">
                <span className="text-surface-900 block">Minha Assinatura</span>
                <span className="text-xs text-surface-500">{planName}</span>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-surface-400" />
          </button>

          <button
            onClick={() => navigate('/notifications')}
            className="w-full flex items-center justify-between p-4 active:bg-surface-50"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-info-light rounded-full flex items-center justify-center">
                <Bell className="w-5 h-5 text-info-dark" />
              </div>
              <span className="text-surface-900">Notificações</span>
            </div>
            <ChevronRight className="w-5 h-5 text-surface-400" />
          </button>
        </div>

        <button
          onClick={() => setShowLogoutModal(true)}
          className="card w-full flex items-center justify-center gap-2 p-4 text-red-600 active:bg-red-50"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Sair da conta</span>
        </button>

        <p className="text-center text-sm text-surface-400 pt-4">
          Agenda HOF Mobile v1.0.0
        </p>
      </div>

      {/* Logout Modal - iOS Style */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowLogoutModal(false)}
          />

          {/* Modal - iOS Style */}
          <div className="relative bg-white/95 backdrop-blur-xl rounded-2xl w-full max-w-[270px] shadow-xl overflow-hidden">
            <div className="p-4 text-center">
              <h3 className="text-[17px] font-semibold text-surface-900">
                Sair da conta?
              </h3>
              <p className="text-[13px] text-surface-500 mt-1">
                Você precisará fazer login novamente para acessar sua conta.
              </p>
            </div>

            <div className="border-t border-surface-200">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="w-full py-3 text-[17px] text-primary-500 font-normal border-b border-surface-200 active:bg-surface-100"
              >
                Cancelar
              </button>
              <button
                onClick={handleSignOut}
                disabled={loggingOut}
                className="w-full py-3 text-[17px] text-red-500 font-semibold active:bg-surface-100 disabled:opacity-50"
              >
                {loggingOut ? 'Saindo...' : 'Sair'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
