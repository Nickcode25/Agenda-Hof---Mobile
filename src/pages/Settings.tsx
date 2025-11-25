import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useSubscription } from '@/contexts/SubscriptionContext'
import { Header } from '@/components/layout/Header'
import { Avatar } from '@/components/ui/Avatar'
import { LogOut, ChevronRight, Bell, Shield, HelpCircle, CreditCard, Crown, Clock, ExternalLink } from 'lucide-react'

const SITE_URL = import.meta.env.VITE_SITE_URL || 'https://www.agendahof.com'

export function SettingsPage() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const { isActive, planName, subscription, isOnTrial, trialDaysLeft } = useSubscription()

  const handleSignOut = async () => {
    if (confirm('Deseja sair da sua conta?')) {
      await signOut()
    }
  }

  const handleOpenWebsite = () => {
    window.open(`${SITE_URL}/login`, '_blank')
  }

  return (
    <div className="min-h-screen bg-surface-50 pb-20">
      <Header title="Configurações" />

      {/* Profile Section */}
      <div className="bg-white px-4 py-6 border-b border-surface-100">
        <div className="flex items-center gap-4">
          <Avatar name={user?.email || 'Usuário'} size="lg" />
          <div className="flex-1">
            <h2 className="font-semibold text-surface-900">
              {user?.user_metadata?.name || 'Usuário'}
            </h2>
            <p className="text-surface-500 text-sm">{user?.email}</p>
          </div>
        </div>

        {/* Plano atual */}
        <div className={`mt-4 p-3 rounded-xl flex items-center justify-between ${
          isOnTrial ? 'bg-orange-50 border border-orange-200' : 'bg-surface-50'
        }`}>
          <div className="flex items-center gap-2">
            {isOnTrial ? (
              <Clock className="w-5 h-5 text-orange-500" />
            ) : (
              <Crown className={`w-5 h-5 ${isActive ? 'text-orange-500' : 'text-surface-400'}`} />
            )}
            <div>
              <p className="text-sm font-medium text-surface-900">{planName}</p>
              <p className="text-xs text-surface-500">
                {isOnTrial
                  ? `${trialDaysLeft} ${trialDaysLeft === 1 ? 'dia restante' : 'dias restantes'}`
                  : isActive
                    ? 'Assinatura ativa'
                    : subscription
                      ? 'Assinatura inativa'
                      : 'Sem assinatura'}
              </p>
            </div>
          </div>
          <button
            onClick={handleOpenWebsite}
            className={`text-xs font-medium px-3 py-1.5 rounded-lg flex items-center gap-1 ${
              isOnTrial
                ? 'bg-orange-500 text-white'
                : isActive
                  ? 'bg-surface-200 text-surface-600'
                  : 'bg-orange-500 text-white'
            }`}
          >
            {isOnTrial ? 'Ver planos' : isActive ? 'Gerenciar' : 'Assinar'}
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Settings List */}
      <div className="px-4 py-4 space-y-4">
        <div className="card divide-y divide-surface-100 p-0 overflow-hidden">
          <button
            onClick={handleOpenWebsite}
            className="w-full flex items-center justify-between p-4 active:bg-surface-50"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-orange-100 rounded-full flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-orange-600" />
              </div>
              <div className="text-left">
                <span className="text-surface-900 block">Planos</span>
                <span className="text-xs text-surface-500">{planName}</span>
              </div>
            </div>
            <ExternalLink className="w-5 h-5 text-surface-400" />
          </button>

          <button className="w-full flex items-center justify-between p-4 active:bg-surface-50">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center">
                <Bell className="w-5 h-5 text-blue-600" />
              </div>
              <span className="text-surface-900">Notificações</span>
            </div>
            <ChevronRight className="w-5 h-5 text-surface-400" />
          </button>

          <button className="w-full flex items-center justify-between p-4 active:bg-surface-50">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center">
                <Shield className="w-5 h-5 text-green-600" />
              </div>
              <span className="text-surface-900">Privacidade</span>
            </div>
            <ChevronRight className="w-5 h-5 text-surface-400" />
          </button>

          <button className="w-full flex items-center justify-between p-4 active:bg-surface-50">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-purple-100 rounded-full flex items-center justify-center">
                <HelpCircle className="w-5 h-5 text-purple-600" />
              </div>
              <span className="text-surface-900">Ajuda</span>
            </div>
            <ChevronRight className="w-5 h-5 text-surface-400" />
          </button>
        </div>

        <button
          onClick={handleSignOut}
          className="card w-full flex items-center justify-center gap-2 p-4 text-red-600 active:bg-red-50"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Sair da conta</span>
        </button>

        <p className="text-center text-sm text-surface-400 pt-4">
          AgendaHOF Mobile v1.0.0
        </p>
      </div>
    </div>
  )
}
