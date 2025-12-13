import { useState } from 'react'
import { useSubscription } from '@/contexts/SubscriptionContext'
import { useAuth } from '@/contexts/AuthContext'
import { AlertTriangle, Clock, ExternalLink, LogOut } from 'lucide-react'

const SITE_URL = import.meta.env.VITE_SITE_URL || 'https://www.agendahof.com'

export function SubscriptionBlockedPage() {
  const { subscription, trialExpired } = useSubscription()
  const { signOut } = useAuth()
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const handleSignOut = async () => {
    setLoggingOut(true)
    await signOut()
    setLoggingOut(false)
    setShowLogoutModal(false)
  }

  const handleOpenWebsite = () => {
    window.open(`${SITE_URL}/login`, '_blank')
  }

  const getStatusMessage = () => {
    // Primeiro verifica se o trial expirou (sem assinatura ativa)
    if (trialExpired && !subscription) {
      return {
        title: 'Período de teste expirou',
        message: 'Seu período de teste de 7 dias chegou ao fim. Escolha um plano para continuar usando o AgendaHOF.',
        icon: 'clock',
      }
    }

    if (!subscription) {
      return {
        title: 'Sem assinatura ativa',
        message: 'Você ainda não possui uma assinatura. Escolha um plano para começar a usar o AgendaHOF.',
        icon: 'alert',
      }
    }

    switch (subscription.status) {
      case 'cancelled':
        return {
          title: 'Assinatura cancelada',
          message: 'Sua assinatura foi cancelada. Assine novamente para continuar usando o AgendaHOF.',
          icon: 'alert',
        }
      case 'expired':
        return {
          title: 'Assinatura expirada',
          message: 'Sua assinatura expirou. Renove seu plano para continuar usando o AgendaHOF.',
          icon: 'alert',
        }
      default:
        return {
          title: 'Assinatura inativa',
          message: 'Sua assinatura não está ativa. Escolha um plano para continuar usando o AgendaHOF.',
          icon: 'alert',
        }
    }
  }

  const { title, message, icon } = getStatusMessage()

  return (
    <div className="min-h-screen bg-surface-50 flex flex-col">
      <div className="h-safe-top bg-surface-50" />
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Ícone */}
        <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 ${
          icon === 'clock' ? 'bg-primary-100' : 'bg-error-light'
        }`}>
          {icon === 'clock' ? (
            <Clock className="w-12 h-12 text-primary-500" />
          ) : (
            <AlertTriangle className="w-12 h-12 text-error" />
          )}
        </div>

        {/* Título e mensagem */}
        <h1 className="text-2xl font-bold text-surface-900 text-center mb-3">
          {title}
        </h1>
        <p className="text-surface-500 text-center mb-8 max-w-xs">
          {message}
        </p>

        {/* Botão de ver planos */}
        <button
          onClick={handleOpenWebsite}
          className="btn-primary w-full max-w-xs flex items-center justify-center gap-2"
        >
          <ExternalLink className="w-5 h-5" />
          Ver planos no site
        </button>

        {/* Botão de sair */}
        <button
          onClick={() => setShowLogoutModal(true)}
          className="mt-4 text-surface-500 flex items-center gap-2 py-2"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-sm">Sair da conta</span>
        </button>
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

      {/* Footer */}
      <div className="pb-8 px-6">
        <p className="text-center text-xs text-surface-400">
          Dúvidas? Entre em contato pelo WhatsApp
        </p>
        <p className="text-center text-xs text-surface-400 mt-1">
          suporte@agendahof.com
        </p>
      </div>
    </div>
  )
}
