import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSubscription } from '@/contexts/SubscriptionContext'
import { Header } from '@/components/layout/Header'
import { Loading } from '@/components/ui/Loading'
import {
  Crown,
  Gift,
  Clock,
  Check,
  CreditCard,
  Mail,
  RefreshCw
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'


// Features por tipo de plano
const planFeatures = {
  basic: [
    'Agenda de agendamentos',
    'Até 25 pacientes',
    'Até 25 agendamentos/mês',
    'Suporte por email'
  ],
  pro: [
    'Agenda ilimitada',
    'Pacientes ilimitados',
    'Gestão de profissionais',
    'Procedimentos personalizados',
    'Relatórios básicos'
  ],
  premium: [
    'Agenda ilimitada',
    'Pacientes ilimitados',
    'Integração WhatsApp',
    'Gestão de alunos/cursos',
    'Relatórios financeiros',
    'Suporte prioritário'
  ],
  courtesy: [
    'Acesso completo Premium',
    'Todas as funcionalidades',
    'Sem cobrança mensal',
    'Suporte dedicado'
  ],
  trial: [
    'Acesso completo por 7 dias',
    'Todas as funcionalidades',
    'Sem compromisso',
    'Teste grátis'
  ]
}

export function MySubscriptionPage() {
  const navigate = useNavigate()
  const {
    subscription,
    loading: subLoading,
    isActive,
    isOnTrial,
    trialDaysLeft,
    planName,
    isCourtesy,
    hasPaidSubscription,
    refetch
  } = useSubscription()

  const [refreshing, setRefreshing] = useState(false)

  // Determinar tipo de plano para features e cor
  const getPlanType = (): 'basic' | 'pro' | 'premium' | 'courtesy' | 'trial' => {
    if (isCourtesy) return 'courtesy'

    // Se tem assinatura paga, determinar pelo valor
    if (hasPaidSubscription && subscription) {
      const amount = subscription.plan_amount || 0
      if (amount >= 99) return 'premium'
      if (amount >= 79) return 'pro'
      return 'basic'
    }

    // Se está em trial
    if (isOnTrial) return 'trial'

    return 'trial'
  }

  const planType = getPlanType()

  // Cores do header baseado no tipo
  const headerColors = {
    premium: 'from-orange-500 to-orange-600',
    courtesy: 'from-orange-500 to-orange-600',
    trial: 'from-blue-500 to-blue-600',
    pro: 'from-emerald-500 to-emerald-600',
    basic: 'from-gray-500 to-gray-600'
  }

  // Ícone baseado no tipo
  const PlanIcon = planType === 'courtesy' ? Gift : planType === 'trial' ? Clock : Crown

  // Formatar data
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    try {
      return format(parseISO(dateStr), "dd/MM/yyyy", { locale: ptBR })
    } catch {
      return '-'
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await refetch()
    } finally {
      setRefreshing(false)
    }
  }

  const isLoading = subLoading || refreshing

  // Se não tem assinatura ativa, redirecionar para bloqueio
  if (!subLoading && !isActive) {
    navigate('/subscription-blocked', { replace: true })
    return null
  }

  if (subLoading) {
    return <Loading fullScreen text="Carregando assinatura..." />
  }

  return (
    <div className="min-h-screen bg-surface-50 pb-24">
      <Header
        title="Minha Assinatura"
        showBack
      />

      <div className="px-4 py-6 space-y-4">
        {/* Card Principal - Status do Plano */}
        <section className="card p-0 overflow-hidden">
          {/* Header com gradiente */}
          <div className={`bg-gradient-to-r ${headerColors[planType]} p-5 text-white`}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <PlanIcon className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-lg">{planName}</h2>
                    {isActive && (
                      <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs font-medium">
                        Ativo
                      </span>
                    )}
                  </div>
                  {hasPaidSubscription && subscription?.plan_amount && (
                    <p className="text-white/80 text-sm">
                      R$ {subscription.plan_amount.toFixed(2)}/mês
                    </p>
                  )}
                  {isOnTrial && !hasPaidSubscription && (
                    <p className="text-white/80 text-sm">
                      {trialDaysLeft} {trialDaysLeft === 1 ? 'dia restante' : 'dias restantes'}
                    </p>
                  )}
                  {isCourtesy && subscription?.next_billing_date && (
                    <p className="text-white/80 text-sm">
                      Válido até {formatDate(subscription.next_billing_date)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Recursos incluídos */}
          <div className="p-4">
            <h3 className="text-sm font-semibold text-surface-700 mb-3">Recursos incluídos</h3>
            <div className="space-y-2">
              {planFeatures[planType].map((feature, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-green-600" />
                  </div>
                  <span className="text-sm text-surface-600">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Datas importantes */}
          {(subscription?.created_at || subscription?.next_billing_date) && (
            <div className="px-4 pb-4">
              <div className="border-t border-surface-100 pt-4 space-y-2">
                {subscription?.created_at && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-surface-500">Assinante desde</span>
                    <span className="text-surface-700 font-medium">{formatDate(subscription.created_at)}</span>
                  </div>
                )}
                {hasPaidSubscription && subscription?.next_billing_date && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-surface-500">Próxima cobrança</span>
                    <span className="text-surface-700 font-medium">{formatDate(subscription.next_billing_date)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Card de Método de Pagamento (apenas para pagantes) */}
        {hasPaidSubscription && (
          <section className="card">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="w-5 h-5 text-primary-500" />
              <h3 className="font-semibold text-surface-900">Método de Pagamento</h3>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-surface-500">Status</span>
                <span className="text-sm text-surface-700">Ativo</span>
              </div>

              {subscription?.next_billing_date && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-surface-500">Próxima cobrança</span>
                  <div className="text-right">
                    <p className="font-medium text-surface-900">
                      R$ {subscription.plan_amount?.toFixed(2)}
                    </p>
                    <p className="text-xs text-surface-500">
                      {formatDate(subscription.next_billing_date)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Card sem assinatura/cortesia */}
        {!hasPaidSubscription && (
          <section className="card">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="w-5 h-5 text-primary-500" />
              <h3 className="font-semibold text-surface-900">Pagamentos</h3>
            </div>

            <div className="text-center py-4">
              <div className="w-12 h-12 bg-surface-100 rounded-full flex items-center justify-center mx-auto mb-3">
                {isCourtesy ? <Gift className="w-6 h-6 text-surface-400" /> : <Clock className="w-6 h-6 text-surface-400" />}
              </div>
              <p className="text-surface-600 font-medium">
                {isCourtesy ? 'Você possui acesso cortesia' : 'Período de teste ativo'}
              </p>
              <p className="text-sm text-surface-400 mt-1">
                {isCourtesy
                  ? 'Aproveite todos os recursos sem cobrança'
                  : `${trialDaysLeft} ${trialDaysLeft === 1 ? 'dia restante' : 'dias restantes'}`}
              </p>
            </div>
          </section>
        )}

        {/* Informação sobre gerenciamento pelo site */}
        <section className="card bg-surface-100 border-0">
          <p className="text-sm text-surface-600 text-center">
            Para alterar ou cancelar sua assinatura, acesse{' '}
            <span className="font-medium text-surface-700">agendahof.com.br</span>
          </p>
        </section>

        {/* Botão de atualizar status */}
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="w-full py-3 rounded-xl bg-primary-500 text-white font-medium flex items-center justify-center gap-2 active:bg-primary-600 transition-colors disabled:opacity-70"
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              Atualizando...
            </>
          ) : (
            <>
              <RefreshCw className="w-5 h-5" />
              Atualizar status
            </>
          )}
        </button>

        {/* Card de Ajuda */}
        <section className="card">
          <div className="flex items-center gap-2 mb-3">
            <Mail className="w-5 h-5 text-primary-500" />
            <h3 className="font-semibold text-surface-900">Precisa de ajuda?</h3>
          </div>
          <p className="text-sm text-surface-500 mb-3">
            Entre em contato com nosso suporte para dúvidas sobre sua assinatura.
          </p>
          <a
            href="mailto:suporte@agendahof.com.br"
            className="text-sm text-primary-500 font-medium"
          >
            suporte@agendahof.com.br
          </a>
        </section>
      </div>
    </div>
  )
}
