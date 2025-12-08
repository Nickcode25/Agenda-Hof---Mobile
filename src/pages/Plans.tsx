import { Header } from '@/components/layout/Header'
import { useSubscription } from '@/contexts/SubscriptionContext'
import { Check, X, Crown, ExternalLink, Loader2, Clock } from 'lucide-react'

const SITE_URL = import.meta.env.VITE_SITE_URL || 'https://www.agendahof.com'

interface PlanFeature {
  name: string
  included: boolean
}

interface Plan {
  id: string
  name: string
  description: string
  price: number
  features: PlanFeature[]
  popular?: boolean
}

const plans: Plan[] = [
  {
    id: 'basico',
    name: 'Plano Básico',
    description: 'Para profissionais em início de atividade.',
    price: 49.90,
    features: [
      { name: 'Agendamentos limitados', included: true },
      { name: 'Agenda inteligente', included: true },
      { name: 'Gestão de Pacientes', included: false },
      { name: 'Gestão de Profissionais', included: false },
      { name: 'Analytics Avançado', included: false },
      { name: 'Gestão Financeira', included: false },
      { name: 'Controle de Estoque', included: false },
    ],
  },
  {
    id: 'pro',
    name: 'Plano Pro',
    description: 'Para profissionais em crescimento.',
    price: 79.90,
    features: [
      { name: 'Agendamentos ilimitados', included: true },
      { name: 'Agenda inteligente', included: true },
      { name: 'Gestão de Pacientes', included: true },
      { name: 'Gestão de Profissionais', included: true },
      { name: 'Analytics Avançado', included: false },
      { name: 'Gestão Financeira', included: false },
      { name: 'Controle de Estoque', included: false },
    ],
  },
  {
    id: 'premium',
    name: 'Plano Premium',
    description: 'Para profissionais consolidados.',
    price: 99.90,
    popular: true,
    features: [
      { name: 'Agendamentos ilimitados', included: true },
      { name: 'Agenda inteligente', included: true },
      { name: 'Analytics Avançado', included: true },
      { name: 'Gestão Financeira', included: true },
      { name: 'Gestão de Pacientes', included: true },
      { name: 'Gestão de Profissionais', included: true },
      { name: 'Controle de Estoque', included: true },
    ],
  },
]

export function PlansPage() {
  const { subscription, isActive, planName, loading, isOnTrial, trialDaysLeft, trialExpired } = useSubscription()

  const getCurrentPlanId = (): string | null => {
    if (!subscription || !isActive) return null
    const amount = subscription.plan_amount
    if (amount <= 49.90) return 'basico'
    if (amount <= 79.90) return 'pro'
    return 'premium'
  }

  const currentPlanId = getCurrentPlanId()

  const handleOpenWebsite = () => {
    window.open(`${SITE_URL}/login`, '_blank')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-50 pb-20">
        <Header title="Planos" showBack />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface-50 pb-20">
      <Header title="Planos" showBack />

      <div className="px-4 py-6">
        <h2 className="text-2xl font-bold text-center text-surface-900 mb-2">
          Nossos Planos
        </h2>
        <p className="text-center text-surface-500 text-sm mb-6">
          Conheça os planos disponíveis para sua clínica
        </p>

        {/* Status atual */}
        {isOnTrial && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-600" />
              <span className="font-medium text-orange-800">
                Período de teste - {trialDaysLeft} {trialDaysLeft === 1 ? 'dia restante' : 'dias restantes'}
              </span>
            </div>
            <p className="text-sm text-orange-600 mt-1">
              Acesse nosso site para assinar um plano
            </p>
          </div>
        )}

        {!isOnTrial && isActive && subscription && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-green-600" />
              <span className="font-medium text-green-800">
                Você está no {planName}
              </span>
            </div>
          </div>
        )}

        {trialExpired && !subscription && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2">
              <X className="w-5 h-5 text-red-600" />
              <span className="font-medium text-red-800">
                Seu período de teste expirou
              </span>
            </div>
            <p className="text-sm text-red-600 mt-1">
              Acesse nosso site para assinar um plano
            </p>
          </div>
        )}

        {!isActive && subscription && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2">
              <X className="w-5 h-5 text-red-600" />
              <span className="font-medium text-red-800">
                Sua assinatura está {subscription.status === 'cancelled' ? 'cancelada' : 'suspensa'}
              </span>
            </div>
            <p className="text-sm text-red-600 mt-1">
              Acesse nosso site para regularizar sua assinatura
            </p>
          </div>
        )}

        {/* Cards de planos */}
        <div className="space-y-4">
          {plans.map((plan) => {
            const isCurrent = currentPlanId === plan.id

            return (
              <div
                key={plan.id}
                className={`card relative overflow-hidden ${
                  plan.popular ? 'border-2 border-orange-500' : ''
                } ${isCurrent ? 'ring-2 ring-green-500' : ''}`}
              >
                {/* Badge Popular */}
                {plan.popular && (
                  <div className="absolute -top-0 -right-0">
                    <div className="bg-orange-500 text-white text-xs font-semibold px-3 py-1.5 rounded-bl-xl flex items-center gap-1">
                      <Crown className="w-3 h-3" />
                      Mais Popular
                    </div>
                  </div>
                )}

                {/* Badge Plano Atual */}
                {isCurrent && (
                  <div className="absolute top-0 left-0">
                    <div className="bg-green-500 text-white text-xs font-semibold px-3 py-1.5 rounded-br-xl flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      Seu plano
                    </div>
                  </div>
                )}

                {/* Ícone */}
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                  isCurrent ? 'bg-green-100' : plan.popular ? 'bg-orange-100' : 'bg-surface-100'
                } ${isCurrent || plan.popular ? 'mt-6' : ''}`}>
                  <Crown className={`w-6 h-6 ${isCurrent ? 'text-green-500' : plan.popular ? 'text-orange-500' : 'text-surface-500'}`} />
                </div>

                {/* Nome e descrição */}
                <h3 className="text-lg font-bold text-surface-900">{plan.name}</h3>
                <p className="text-sm text-surface-500 mt-1 mb-4">{plan.description}</p>

                {/* Preço */}
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-sm text-surface-500">R$</span>
                  <span className="text-4xl font-bold text-surface-900">
                    {Math.floor(plan.price)}
                  </span>
                  <span className="text-lg text-surface-500">,{String(plan.price).split('.')[1] || '90'}</span>
                  <span className="text-surface-400 ml-1">por mês</span>
                </div>

                {/* Features */}
                <ul className="space-y-2.5">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2">
                      {feature.included ? (
                        <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      ) : (
                        <X className="w-4 h-4 text-surface-300 flex-shrink-0" />
                      )}
                      <span className={`text-sm ${
                        feature.included ? 'text-surface-700' : 'text-surface-400'
                      }`}>
                        {feature.name}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>

        {/* Botão para acessar o site */}
        <div className="mt-6">
          <button
            onClick={handleOpenWebsite}
            className="w-full py-3 rounded-xl bg-orange-500 text-white font-medium flex items-center justify-center gap-2 active:bg-orange-600 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Assinar pelo site
          </button>
          <p className="text-center text-surface-400 text-xs mt-3">
            A assinatura é realizada através do nosso site oficial
          </p>
        </div>
      </div>
    </div>
  )
}
