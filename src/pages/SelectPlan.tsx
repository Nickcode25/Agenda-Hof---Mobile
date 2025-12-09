import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Header } from '@/components/layout/Header'
import { ChevronLeft, Check, Crown, Zap, Star } from 'lucide-react'

export interface Plan {
  id: string
  name: string
  price: number
  originalPrice?: number
  description: string
  features: string[]
  popular?: boolean
  icon: 'basic' | 'pro' | 'premium'
}

const plans: Plan[] = [
  {
    id: 'basic',
    name: 'Básico',
    price: 49.90,
    description: 'Ideal para começar',
    icon: 'basic',
    features: [
      'Agenda de agendamentos',
      'Até 25 pacientes',
      'Até 25 agendamentos/mês',
      'Suporte por email'
    ]
  },
  {
    id: 'pro',
    name: 'Profissional',
    price: 79.90,
    description: 'Para profissionais em crescimento',
    icon: 'pro',
    features: [
      'Agenda ilimitada',
      'Pacientes ilimitados',
      'Gestão de profissionais',
      'Procedimentos personalizados',
      'Relatórios básicos'
    ]
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 99.90,
    description: 'Solução completa',
    icon: 'premium',
    popular: true,
    features: [
      'Tudo do Profissional +',
      'Integração WhatsApp',
      'Gestão de alunos/cursos',
      'Relatórios financeiros',
      'Controle de estoque',
      'Suporte premium 24/7'
    ]
  }
]

const planIcons = {
  basic: Star,
  pro: Zap,
  premium: Crown
}

export function SelectPlanPage() {
  const navigate = useNavigate()
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)

  const handleContinue = () => {
    if (selectedPlan) {
      navigate('/checkout', { state: { plan: selectedPlan } })
    }
  }

  return (
    <div className="min-h-screen bg-surface-50 pb-24">
      <Header
        title="Escolha seu Plano"
        leftAction={
          <button onClick={() => navigate(-1)} className="p-2 -ml-2">
            <ChevronLeft className="w-6 h-6" />
          </button>
        }
      />

      <div className="px-4 py-6">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-surface-900 mb-2">
            Escolha o plano ideal
          </h1>
          <p className="text-surface-500">
            Cancele a qualquer momento. Sem multas.
          </p>
        </div>

        {/* Plans */}
        <div className="space-y-4">
          {plans.map((plan) => {
            const Icon = planIcons[plan.icon]
            const isSelected = selectedPlan?.id === plan.id

            return (
              <button
                key={plan.id}
                onClick={() => setSelectedPlan(plan)}
                className={`w-full text-left card p-0 overflow-hidden transition-all ${
                  isSelected
                    ? 'ring-2 ring-primary-500 border-primary-500'
                    : 'border-surface-200'
                }`}
              >
                {/* Popular badge */}
                {plan.popular && (
                  <div className="bg-primary-500 text-white text-xs font-semibold py-1 px-3 text-center">
                    MAIS POPULAR
                  </div>
                )}

                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        plan.icon === 'premium' ? 'bg-orange-100' :
                        plan.icon === 'pro' ? 'bg-emerald-100' : 'bg-surface-100'
                      }`}>
                        <Icon className={`w-5 h-5 ${
                          plan.icon === 'premium' ? 'text-orange-500' :
                          plan.icon === 'pro' ? 'text-emerald-500' : 'text-surface-500'
                        }`} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-surface-900">{plan.name}</h3>
                        <p className="text-xs text-surface-500">{plan.description}</p>
                      </div>
                    </div>

                    {/* Radio indicator */}
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      isSelected
                        ? 'border-primary-500 bg-primary-500'
                        : 'border-surface-300'
                    }`}>
                      {isSelected && <Check className="w-4 h-4 text-white" />}
                    </div>
                  </div>

                  {/* Price */}
                  <div className="flex items-baseline gap-1 mb-3">
                    <span className="text-2xl font-bold text-surface-900">
                      R$ {plan.price.toFixed(2).replace('.', ',')}
                    </span>
                    <span className="text-surface-500 text-sm">/mês</span>
                  </div>

                  {/* Features */}
                  <div className="space-y-2">
                    {plan.features.slice(0, 3).map((feature, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                        <span className="text-sm text-surface-600">{feature}</span>
                      </div>
                    ))}
                    {plan.features.length > 3 && (
                      <p className="text-xs text-primary-500 font-medium pl-6">
                        + {plan.features.length - 3} recursos
                      </p>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Continue Button */}
        <div className="mt-6">
          <button
            onClick={handleContinue}
            disabled={!selectedPlan}
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continuar com {selectedPlan?.name || 'plano'}
          </button>
          <p className="text-center text-xs text-surface-400 mt-3">
            Ao continuar, você concorda com nossos Termos de Uso e Política de Privacidade
          </p>
        </div>
      </div>
    </div>
  )
}
