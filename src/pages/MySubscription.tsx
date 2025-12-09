import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useSubscription } from '@/contexts/SubscriptionContext'
import { supabase } from '@/lib/supabase'
import { Header } from '@/components/layout/Header'
import { Avatar } from '@/components/ui/Avatar'
import { Loading } from '@/components/ui/Loading'
import {
  ChevronLeft,
  Crown,
  Gift,
  Clock,
  Check,
  CreditCard,
  User,
  AlertTriangle,
  Mail,
  Sparkles,
  Zap,
  Star
} from 'lucide-react'
import { format, parseISO, differenceInDays, differenceInMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'


interface PaymentHistory {
  id: string
  amount: number
  status: string
  payment_method: string
  created_at: string
}

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
    'Procedimentos personalizados'
  ],
  premium: [
    'Tudo do Pro +',
    'Integração WhatsApp',
    'Gestão de alunos/cursos',
    'Relatórios financeiros',
    'Controle de estoque',
    'Suporte premium 24/7'
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
  const { user } = useAuth()
  const {
    subscription,
    loading: subLoading,
    isActive,
    isOnTrial,
    trialDaysLeft,
    planName,
    isCourtesy,
    hasPaidSubscription
  } = useSubscription()

  const [payments, setPayments] = useState<PaymentHistory[]>([])
  const [loadingPayments, setLoadingPayments] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [showPaymentsModal, setShowPaymentsModal] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  // Buscar histórico de pagamentos
  useEffect(() => {
    if (user && hasPaidSubscription) {
      fetchPaymentHistory()
    }
  }, [user, hasPaidSubscription])

  const fetchPaymentHistory = async () => {
    if (!user) return
    setLoadingPayments(true)
    try {
      const { data } = await supabase
        .from('payment_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)

      if (data) setPayments(data)
    } catch (err) {
      console.error('Erro ao buscar pagamentos:', err)
    } finally {
      setLoadingPayments(false)
    }
  }

  // Determinar tipo de plano para features e cor
  const getPlanType = (): 'basic' | 'pro' | 'premium' | 'courtesy' | 'trial' => {
    if (isCourtesy) return 'courtesy'
    if (isOnTrial) return 'trial'
    if (!subscription) return 'trial'

    const amount = subscription.plan_amount || 0
    if (amount >= 99) return 'premium'
    if (amount >= 79) return 'pro'
    return 'basic'
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

  // Calcular estatísticas
  const calculateStats = () => {
    if (!subscription?.created_at) return { months: 0, days: 0, totalInvested: 0 }

    const startDate = parseISO(subscription.created_at)
    const now = new Date()
    const months = differenceInMonths(now, startDate)
    const days = differenceInDays(now, startDate) % 30

    const totalInvested = payments
      .filter(p => p.status === 'approved')
      .reduce((sum, p) => sum + p.amount, 0)

    return { months, days, totalInvested }
  }

  const stats = calculateStats()

  // Formatar data
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    try {
      return format(parseISO(dateStr), "dd/MM/yyyy", { locale: ptBR })
    } catch {
      return '-'
    }
  }

  // Status badge
  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      approved: 'bg-green-100 text-green-700',
      pending: 'bg-yellow-100 text-yellow-700',
      rejected: 'bg-red-100 text-red-700',
      refunded: 'bg-orange-100 text-orange-700',
      cancelled: 'bg-gray-100 text-gray-600'
    }
    const labels: Record<string, string> = {
      approved: 'Aprovado',
      pending: 'Pendente',
      rejected: 'Rejeitado',
      refunded: 'Reembolsado',
      cancelled: 'Cancelado'
    }
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || styles.pending}`}>
        {labels[status] || status}
      </span>
    )
  }

  const handleCancelSubscription = async () => {
    if (!subscription?.id) return
    setCancelling(true)

    try {
      // Aqui você chamaria sua API de cancelamento
      // await cancelSubscription(subscription.id)
      alert('Funcionalidade de cancelamento será implementada em breve.')
    } catch (err) {
      console.error('Erro ao cancelar:', err)
    } finally {
      setCancelling(false)
      setShowCancelModal(false)
    }
  }

  const handleSelectPlan = () => {
    navigate('/select-plan')
  }

  if (subLoading) {
    return <Loading fullScreen text="Carregando assinatura..." />
  }

  return (
    <div className="min-h-screen bg-surface-50 pb-24">
      <Header
        title="Minha Assinatura"
        leftAction={
          <button onClick={() => navigate(-1)} className="p-2 -ml-2">
            <ChevronLeft className="w-6 h-6" />
          </button>
        }
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
                  {isOnTrial && (
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

        {/* Card de Informações da Conta */}
        <section className="card">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-5 h-5 text-primary-500" />
            <h3 className="font-semibold text-surface-900">Informações da Conta</h3>
          </div>

          <div className="flex items-center gap-4">
            <Avatar name={user?.user_metadata?.name || user?.email || 'Usuário'} size="lg" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-surface-900 truncate">
                {user?.user_metadata?.name || 'Usuário'}
              </p>
              <p className="text-sm text-surface-500 truncate">{user?.email}</p>
            </div>
          </div>

          <button
            onClick={() => navigate('/profile')}
            className="mt-4 w-full py-2.5 border border-surface-200 rounded-xl text-surface-700 font-medium text-sm active:bg-surface-50 flex items-center justify-center gap-2"
          >
            Editar Perfil
            <ChevronLeft className="w-4 h-4 rotate-180" />
          </button>
        </section>

        {/* Card de Gestão de Pagamentos (apenas para pagantes) */}
        {hasPaidSubscription && (
          <section className="card">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="w-5 h-5 text-primary-500" />
              <h3 className="font-semibold text-surface-900">Pagamentos</h3>
            </div>

            <div className="space-y-3">
              {subscription?.next_billing_date && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-surface-500">Próximo pagamento</span>
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

              <div className="flex items-center justify-between">
                <span className="text-sm text-surface-500">Método</span>
                <span className="text-sm text-surface-700">Cartão de Crédito</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-surface-500">Status</span>
                {getStatusBadge('approved')}
              </div>
            </div>

            <button
              onClick={() => setShowPaymentsModal(true)}
              className="mt-4 w-full py-2.5 border border-surface-200 rounded-xl text-surface-700 font-medium text-sm active:bg-surface-50"
            >
              Ver Histórico de Faturas
            </button>
          </section>
        )}

        {/* Card de Estatísticas (apenas para pagantes) */}
        {hasPaidSubscription && stats.months > 0 && (
          <section className="card">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-primary-500" />
              <h3 className="font-semibold text-surface-900">Estatísticas</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-surface-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-primary-500">
                  {stats.months > 0 ? `${stats.months}m` : ''} {stats.days}d
                </p>
                <p className="text-xs text-surface-500 mt-1">Tempo como assinante</p>
              </div>
              <div className="bg-surface-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-green-500">
                  R$ {stats.totalInvested.toFixed(2)}
                </p>
                <p className="text-xs text-surface-500 mt-1">Total investido</p>
              </div>
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
                {isCourtesy ? 'Você possui acesso cortesia' : 'Nenhum pagamento registrado'}
              </p>
              <p className="text-sm text-surface-400 mt-1">
                {isCourtesy
                  ? 'Aproveite todos os recursos sem cobrança'
                  : 'Assine um plano para ter acesso ilimitado'}
              </p>
            </div>
          </section>
        )}

        {/* Card de Ações */}
        <section className="card">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-primary-500" />
            <h3 className="font-semibold text-surface-900">Ações</h3>
          </div>

          <div className="space-y-3">
            {/* Usuário em trial - ação principal: assinar */}
            {isOnTrial && (
              <>
                <button
                  onClick={handleSelectPlan}
                  className="w-full btn-primary flex items-center justify-center gap-2"
                >
                  <Star className="w-5 h-5" />
                  Assinar Agora
                </button>
                <p className="text-xs text-surface-400 text-center">
                  Seu período de teste termina em {trialDaysLeft} {trialDaysLeft === 1 ? 'dia' : 'dias'}
                </p>
              </>
            )}

            {/* Usuário cortesia - sem ações de upgrade, apenas visualizar planos */}
            {isCourtesy && (
              <button
                onClick={handleSelectPlan}
                className="w-full py-3 border border-surface-200 text-surface-700 rounded-xl font-medium active:bg-surface-50 flex items-center justify-center gap-2"
              >
                Ver Planos Disponíveis
              </button>
            )}

            {/* Usuário pagante - gerenciar assinatura */}
            {hasPaidSubscription && (
              <>
                <button
                  onClick={handleSelectPlan}
                  className="w-full py-3 border border-surface-200 text-surface-700 rounded-xl font-medium active:bg-surface-50"
                >
                  Alterar Plano
                </button>
                <button
                  onClick={() => setShowCancelModal(true)}
                  className="w-full py-2.5 text-red-500 font-medium text-sm"
                >
                  Cancelar Assinatura
                </button>
                <p className="text-xs text-surface-400 text-center">
                  Em caso de cancelamento, você terá acesso até o fim do período atual
                </p>
              </>
            )}

            {/* Usuário inativo (sem trial, sem cortesia, sem assinatura) */}
            {!isActive && !isOnTrial && !isCourtesy && (
              <button
                onClick={handleSelectPlan}
                className="w-full btn-primary flex items-center justify-center gap-2"
              >
                <Star className="w-5 h-5" />
                Escolher um Plano
              </button>
            )}
          </div>
        </section>

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

      {/* Modal de Cancelamento */}
      {showCancelModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowCancelModal(false)}
          />
          <div className="relative bg-white rounded-2xl w-full max-w-sm shadow-xl overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-7 h-7 text-red-500" />
              </div>
              <h3 className="text-lg font-semibold text-surface-900 mb-2">
                Cancelar Assinatura?
              </h3>
              <p className="text-sm text-surface-500">
                Tem certeza que deseja cancelar? Você terá acesso até o final do período atual.
              </p>
            </div>
            <div className="flex border-t border-surface-200">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 py-3.5 text-surface-600 font-medium border-r border-surface-200 active:bg-surface-50"
              >
                Voltar
              </button>
              <button
                onClick={handleCancelSubscription}
                disabled={cancelling}
                className="flex-1 py-3.5 text-red-500 font-semibold active:bg-red-50 disabled:opacity-50"
              >
                {cancelling ? 'Cancelando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Histórico de Pagamentos */}
      {showPaymentsModal && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowPaymentsModal(false)}
          />
          <div className="relative bg-white rounded-t-2xl w-full max-h-[80vh] shadow-xl overflow-hidden animate-slide-up safe-area-bottom">
            <div className="sticky top-0 bg-white border-b border-surface-100 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-surface-900">
                  Histórico de Pagamentos
                </h3>
                <button
                  onClick={() => setShowPaymentsModal(false)}
                  className="text-surface-500 font-medium"
                >
                  Fechar
                </button>
              </div>
            </div>

            <div className="p-4 overflow-y-auto max-h-[calc(80vh-60px)]">
              {loadingPayments ? (
                <div className="flex justify-center py-8">
                  <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : payments.length === 0 ? (
                <div className="text-center py-8">
                  <CreditCard className="w-12 h-12 text-surface-300 mx-auto mb-3" />
                  <p className="text-surface-500">Nenhum pagamento encontrado</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="bg-surface-50 rounded-xl p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-surface-900">
                          R$ {payment.amount.toFixed(2)}
                        </span>
                        {getStatusBadge(payment.status)}
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-surface-500">
                          {formatDate(payment.created_at)}
                        </span>
                        <span className="text-surface-500">
                          {payment.payment_method || 'Cartão'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
