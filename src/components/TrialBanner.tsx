import { useState, useEffect } from 'react'
import { Clock, Sparkles, ExternalLink, X } from 'lucide-react'
import { useSubscription } from '@/contexts/SubscriptionContext'

const SITE_URL = import.meta.env.VITE_SITE_URL || 'https://www.agendahof.com'
const DISMISS_KEY = 'trial_banner_dismissed'
const DISMISS_DURATION = 1000 * 60 * 60 * 4 // 4 horas

export function TrialBanner() {
  const { isOnTrial, trialDaysLeft, isCourtesy, planName } = useSubscription()
  const [isDismissed, setIsDismissed] = useState(false)

  // Verificar se foi fechado recentemente
  useEffect(() => {
    const dismissedAt = localStorage.getItem(DISMISS_KEY)
    if (dismissedAt) {
      const elapsed = Date.now() - parseInt(dismissedAt, 10)
      if (elapsed < DISMISS_DURATION) {
        setIsDismissed(true)
      } else {
        localStorage.removeItem(DISMISS_KEY)
      }
    }
  }, [])

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, Date.now().toString())
    setIsDismissed(true)
  }

  // Mostrar banner de cortesia
  if (isCourtesy) {
    return (
      <div className="mx-3 mt-2 mb-1.5 rounded-xl bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="w-4 h-4 text-purple-500 flex-shrink-0" />
            <p className="text-purple-900 font-medium text-xs truncate">
              {planName}
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Não mostrar banner se não está em trial ou foi fechado
  if (!isOnTrial || isDismissed) return null

  // Determinar cor baseado nos dias restantes
  const getColorClass = () => {
    if (trialDaysLeft <= 2) return 'from-red-50 to-orange-50 border-red-200'
    if (trialDaysLeft <= 4) return 'from-amber-50 to-orange-50 border-amber-200'
    return 'from-blue-50 to-indigo-50 border-blue-200'
  }

  const getIconColor = () => {
    if (trialDaysLeft <= 2) return 'text-red-500'
    if (trialDaysLeft <= 4) return 'text-amber-500'
    return 'text-blue-500'
  }

  const getMessage = () => {
    if (trialDaysLeft === 0) return 'Último dia de teste!'
    if (trialDaysLeft === 1) return 'Resta 1 dia'
    return `Restam ${trialDaysLeft} dias`
  }

  const handleOpenWebsite = () => {
    window.open(`${SITE_URL}/login`, '_blank')
  }

  return (
    <div className={`mx-3 mt-2 mb-1.5 rounded-xl border bg-gradient-to-r ${getColorClass()} px-3 py-2`}>
      <div className="flex items-center justify-between gap-2">
        {/* Left side - Info compacto */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {trialDaysLeft <= 2 ? (
            <Clock className={`w-4 h-4 ${getIconColor()} flex-shrink-0`} />
          ) : (
            <Sparkles className={`w-4 h-4 ${getIconColor()} flex-shrink-0`} />
          )}
          <div className="flex items-center gap-1.5 min-w-0">
            <p className="text-gray-900 font-semibold text-xs whitespace-nowrap">
              {getMessage()}
            </p>
            <span className="text-gray-400 text-xs hidden xs:inline">•</span>
            <p className="text-gray-500 text-xs truncate hidden xs:block">
              Acesso completo
            </p>
          </div>
        </div>

        {/* Right side - CTA compacto */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleOpenWebsite}
            className="inline-flex items-center gap-1 bg-gradient-to-r from-primary-500 to-primary-600 active:from-primary-600 active:to-primary-700 text-white px-2.5 py-1 rounded-lg font-medium text-[11px] transition-all shadow-sm"
          >
            <ExternalLink size={12} />
            <span>Ver planos</span>
          </button>
          <button
            onClick={handleDismiss}
            className="p-1 text-gray-400 hover:text-gray-600 active:bg-gray-100 rounded-full"
            aria-label="Fechar"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
