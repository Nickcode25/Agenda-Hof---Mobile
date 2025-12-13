import { useState } from 'react'
import { useSubscription } from '@/contexts/SubscriptionContext'
import { useAuth } from '@/contexts/AuthContext'
import { Lock, LogOut, RefreshCw } from 'lucide-react'
import { useStatusBar } from '@/hooks/useStatusBar'

export function SubscriptionBlockedPage() {
  const { refetch, loading: subscriptionLoading } = useSubscription()
  const { signOut } = useAuth()

  // Status bar com icones pretos (fundo claro)
  useStatusBar('light')

  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const handleSignOut = async () => {
    setLoggingOut(true)
    await signOut()
    setLoggingOut(false)
    setShowLogoutModal(false)
  }

  const handleRefreshSubscription = async () => {
    setRefreshing(true)
    try {
      await refetch()
    } finally {
      setRefreshing(false)
    }
  }

  const isLoading = refreshing || subscriptionLoading

  return (
    <div className="min-h-screen bg-surface-50 flex flex-col">
      <div className="h-safe-top bg-surface-50" />
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Ícone */}
        <div className="w-24 h-24 rounded-full bg-primary-100 flex items-center justify-center mb-6">
          <Lock className="w-12 h-12 text-primary-500" />
        </div>

        {/* Título e mensagem */}
        <h1 className="text-2xl font-bold text-surface-900 text-center mb-3">
          Assinatura necessária
        </h1>
        <p className="text-surface-500 text-center mb-4 max-w-xs">
          Para acessar todas as funcionalidades do Agenda HOF, você precisa de uma assinatura ativa.
        </p>
        <p className="text-surface-400 text-center text-sm mb-8 max-w-xs">
          Acesse agendahof.com.br pelo navegador para gerenciar sua assinatura.
        </p>

        {/* Botão de verificar assinatura */}
        <button
          onClick={handleRefreshSubscription}
          disabled={isLoading}
          className="btn-primary w-full max-w-xs flex items-center justify-center gap-2 disabled:opacity-70"
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              Verificando...
            </>
          ) : (
            <>
              <RefreshCw className="w-5 h-5" />
              Já tenho assinatura
            </>
          )}
        </button>

        {/* Botão de sair */}
        <button
          onClick={() => setShowLogoutModal(true)}
          className="mt-4 text-surface-500 flex items-center gap-2 py-2"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-sm">Sair</span>
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
