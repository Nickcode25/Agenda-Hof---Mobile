import { Clock, Sparkles, ExternalLink } from 'lucide-react'
import { useSubscription } from '@/contexts/SubscriptionContext'

const SITE_URL = import.meta.env.VITE_SITE_URL || 'https://www.agendahof.com'

export function TrialBanner() {
  const { isOnTrial, trialDaysLeft } = useSubscription()

  // Não mostrar banner se não está em trial
  if (!isOnTrial) return null

  // Determinar cor baseado nos dias restantes
  const getColorClass = () => {
    if (trialDaysLeft <= 2) return 'from-red-50 to-orange-50 border-red-200'
    if (trialDaysLeft <= 4) return 'from-yellow-50 to-orange-50 border-yellow-200'
    return 'from-blue-50 to-purple-50 border-blue-200'
  }

  const getIconColor = () => {
    if (trialDaysLeft <= 2) return 'text-red-500'
    if (trialDaysLeft <= 4) return 'text-yellow-500'
    return 'text-blue-500'
  }

  const getMessage = () => {
    if (trialDaysLeft === 0) return 'Último dia do seu período de teste!'
    if (trialDaysLeft === 1) return 'Resta 1 dia do seu período de teste'
    return `Restam ${trialDaysLeft} dias do seu período de teste`
  }

  const handleOpenWebsite = () => {
    window.open(`${SITE_URL}/login`, '_blank')
  }

  return (
    <div className={`mx-4 mt-3 mb-2 rounded-xl border bg-gradient-to-r ${getColorClass()} p-3`}>
      <div className="flex items-center justify-between gap-3">
        {/* Left side - Info */}
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="flex-shrink-0">
            {trialDaysLeft <= 2 ? (
              <Clock className={`w-5 h-5 ${getIconColor()}`} />
            ) : (
              <Sparkles className={`w-5 h-5 ${getIconColor()}`} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-gray-900 font-medium text-sm truncate">
              {getMessage()}
            </p>
            <p className="text-gray-500 text-xs mt-0.5 truncate">
              Acesso completo a todas as funcionalidades
            </p>
          </div>
        </div>

        {/* Right side - CTA */}
        <button
          onClick={handleOpenWebsite}
          className="flex-shrink-0 inline-flex items-center gap-1.5 bg-gradient-to-r from-orange-500 to-orange-600 active:from-orange-600 active:to-orange-700 text-white px-3 py-1.5 rounded-lg font-medium text-xs transition-all shadow-md shadow-orange-500/30"
        >
          <ExternalLink size={14} />
          <span>Ver planos</span>
        </button>
      </div>
    </div>
  )
}
