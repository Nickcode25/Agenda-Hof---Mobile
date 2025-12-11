import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { differenceInDays, parseISO } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { useAuth } from './AuthContext'

const TRIAL_DAYS = 7
const GRACE_PERIOD_DAYS = 5 // Dias de tolerância após vencimento

export interface Subscription {
  id: string
  user_id: string
  plan_id: string | null
  plan_type: 'basic' | 'pro' | 'premium' | null // Tipo do plano
  plan_name: string | null // Nome completo do plano
  status: 'active' | 'cancelled' | 'expired' | 'pending' | 'pending_cancellation'
  plan_amount: number
  discount_percentage: number | null
  next_billing_date: string | null
  created_at: string
  updated_at: string
}

// Função para determinar o tipo do plano pelo NOME (não pelo preço)
// Isso evita bugs quando cupons de desconto são aplicados
const determinePlanTypeByName = (planName: string): 'basic' | 'pro' | 'premium' => {
  const nameLower = planName.toLowerCase()
  if (nameLower.includes('premium')) {
    return 'premium'
  }
  if (nameLower.includes('profissional') || nameLower.includes('pro')) {
    return 'pro'
  }
  return 'basic'
}

// RETROCOMPATIBILIDADE: Corrige plan_type baseado no preço original
// Para assinaturas antigas que foram salvas com plan_type errado devido ao bug do cupom
const getEffectivePlanType = (
  planType: string | null,
  planName: string | null,
  planAmount: number
): 'basic' | 'pro' | 'premium' => {
  // Se tem plan_name, usa o nome para determinar (mais confiável)
  if (planName) {
    return determinePlanTypeByName(planName)
  }

  // Se o plan_type está como 'basic' mas o preço original indica outro plano, corrige
  if (planType === 'basic' && planAmount >= 99) {
    console.log('⚠️ Retrocompatibilidade: corrigindo plan_type de basic para premium (preço original:', planAmount, ')')
    return 'premium'
  }
  if (planType === 'basic' && planAmount >= 79) {
    console.log('⚠️ Retrocompatibilidade: corrigindo plan_type de basic para pro (preço original:', planAmount, ')')
    return 'pro'
  }

  // Retorna o plan_type original ou 'basic' como fallback
  return (planType as 'basic' | 'pro' | 'premium') || 'basic'
}


interface SubscriptionContextType {
  subscription: Subscription | null
  loading: boolean
  isActive: boolean
  isOnTrial: boolean
  trialDaysLeft: number
  trialExpired: boolean
  planName: string
  planType: 'basic' | 'pro' | 'premium' | null // Tipo efetivo do plano (com retrocompatibilidade)
  isCourtesy: boolean
  hasPaidSubscription: boolean
  refetch: () => Promise<void>
  cancelSubscription: () => Promise<{ success: boolean; error?: string }>
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined)

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [isCourtesyUser, setIsCourtesyUser] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchSubscription = async () => {
    if (!user) {
      setSubscription(null)
      setIsCourtesyUser(false)
      setLoading(false)
      return
    }

    setLoading(true)

    try {
      // 1. Primeiro busca assinatura ativa na tabela user_subscriptions
      const { data: activeSubscription, error: subError } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (activeSubscription && !subError) {
        // Converter plan_amount para número (pode vir como string do banco)
        const planAmount = typeof activeSubscription.plan_amount === 'string'
          ? parseFloat(activeSubscription.plan_amount)
          : activeSubscription.plan_amount

        // Converter discount_percentage para número
        const discountPercentage = activeSubscription.discount_percentage
          ? Number(activeSubscription.discount_percentage)
          : null

        // Verificar se é cortesia (100% de desconto)
        const isCourtesy = discountPercentage === 100

        // RETROCOMPATIBILIDADE: Obter o tipo efetivo do plano
        // Corrige assinaturas antigas que foram salvas com plan_type errado devido ao bug do cupom
        const effectivePlanType = getEffectivePlanType(
          activeSubscription.plan_type,
          activeSubscription.plan_name,
          planAmount
        )

        // Normalizar os dados da assinatura
        const normalizedSubscription: Subscription = {
          ...activeSubscription,
          plan_amount: planAmount,
          discount_percentage: discountPercentage,
          plan_type: effectivePlanType, // Usar o tipo corrigido
          plan_name: activeSubscription.plan_name || null,
        }

        if (isCourtesy) {
          setSubscription(normalizedSubscription)
          setIsCourtesyUser(true)
          setLoading(false)
          return
        }

        // Para assinaturas pagas, verificar se não está muito atrasada
        if (normalizedSubscription.next_billing_date) {
          const nextBillingDate = new Date(normalizedSubscription.next_billing_date)
          const daysDiff = differenceInDays(new Date(), nextBillingDate)

          // Se passou mais de 5 dias do vencimento, considerar suspensa
          if (daysDiff > GRACE_PERIOD_DAYS) {
            setSubscription(null)
            setIsCourtesyUser(false)
            setLoading(false)
            return
          }
        }

        // Assinatura paga válida
        setSubscription(normalizedSubscription)
        setIsCourtesyUser(false)
        setLoading(false)
        return
      }

      // 2. Se não tem assinatura ativa, verificar período de trial
      const trialStatus = calculateTrialStatusForUser()
      if (trialStatus.isOnTrial) {
        setSubscription(null)
        setIsCourtesyUser(false)
        setLoading(false)
        return
      }

      // 3. Verificar cortesia na tabela courtesy_users (método alternativo)
      const { data: courtesy } = await supabase
        .from('courtesy_users')
        .select('*')
        .eq('auth_user_id', user.id)
        .eq('is_active', true)
        .single()

      if (courtesy) {
        // Verificar se não expirou
        const isValid = !courtesy.expires_at || new Date(courtesy.expires_at) > new Date()
        if (isValid) {
          setSubscription(null)
          setIsCourtesyUser(true)
          setLoading(false)
          return
        }
      }

      // Nenhuma assinatura válida encontrada
      setSubscription(null)
      setIsCourtesyUser(false)
    } catch (error) {
      console.error('Erro ao verificar assinatura:', error)
      setSubscription(null)
      setIsCourtesyUser(false)
    }

    setLoading(false)
  }

  useEffect(() => {
    fetchSubscription()
  }, [user])

  // Calcular dias desde a criação da conta para o trial
  const calculateTrialStatusForUser = () => {
    if (!user?.created_at) {
      return { isOnTrial: false, trialDaysLeft: 0, trialExpired: false }
    }

    // Verificar se tem trial_end_date nos metadados do usuário
    const userMetadata = user.user_metadata
    let trialEndDate: Date | null = null

    if (userMetadata?.trial_end_date) {
      trialEndDate = new Date(userMetadata.trial_end_date)
    } else {
      // Calcular baseado na data de criação
      const createdAt = parseISO(user.created_at)
      trialEndDate = new Date(createdAt)
      trialEndDate.setDate(trialEndDate.getDate() + TRIAL_DAYS)
    }

    const now = new Date()
    const isOnTrial = now <= trialEndDate
    const daysLeft = Math.max(0, differenceInDays(trialEndDate, now))
    const trialExpired = now > trialEndDate

    return { isOnTrial, trialDaysLeft: daysLeft, trialExpired }
  }

  const { isOnTrial, trialDaysLeft, trialExpired } = calculateTrialStatusForUser()

  // Verificar se é cortesia (via user_subscriptions com 100% desconto OU via courtesy_users)
  const isCourtesy = isCourtesyUser || (subscription?.discount_percentage === 100)

  // Verificar se tem assinatura paga ativa (não cortesia)
  const hasPaidSubscription = subscription?.status === 'active' && !isCourtesy

  // Determinar se tem acesso ativo (assinatura paga, trial ou cortesia)
  const isActive = hasPaidSubscription || isOnTrial || isCourtesy

  // Determinar nome do plano baseado no plan_name ou plan_type (não no preço!)
  const getPlanNameFromSubscription = (sub: Subscription | null): string => {
    if (!sub) return 'Sem plano'

    // Se tem plan_name salvo, usa ele
    if (sub.plan_name) {
      return sub.plan_name
    }

    // Senão, usa o plan_type para determinar o nome
    switch (sub.plan_type) {
      case 'premium':
        return 'Plano Premium'
      case 'pro':
        return 'Plano Profissional'
      case 'basic':
        return 'Plano Básico'
      default:
        return 'Plano Básico'
    }
  }

  // Obter o tipo efetivo do plano (com retrocompatibilidade)
  const effectivePlanType = subscription?.plan_type || null

  const planName = isCourtesy
    ? 'Acesso Cortesia'
    : hasPaidSubscription
      ? getPlanNameFromSubscription(subscription)
      : isOnTrial
        ? `Período de teste (${trialDaysLeft} dias restantes)`
        : 'Sem plano'

  // Função para cancelar assinatura
  const cancelSubscription = async (): Promise<{ success: boolean; error?: string }> => {
    if (!user || !subscription?.id) {
      return { success: false, error: 'Nenhuma assinatura encontrada' }
    }

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL

      const response = await fetch(`${backendUrl}/api/stripe/cancel-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscriptionId: subscription.id,
          userId: user.id,
          immediately: false // Cancela no fim do período pago
        })
      })

      const data = await response.json()

      if (!response.ok) {
        return { success: false, error: data.error || 'Erro ao cancelar assinatura' }
      }

      // Recarregar dados (o backend já atualizou o status)
      await fetchSubscription()

      return { success: true }
    } catch (error) {
      console.error('Erro ao cancelar assinatura:', error)
      return { success: false, error: 'Erro de conexão. Tente novamente.' }
    }
  }

  return (
    <SubscriptionContext.Provider
      value={{
        subscription,
        loading,
        isActive,
        isOnTrial,
        trialDaysLeft,
        trialExpired,
        planName,
        planType: effectivePlanType,
        isCourtesy,
        hasPaidSubscription,
        refetch: fetchSubscription,
        cancelSubscription,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  )
}

export function useSubscription() {
  const context = useContext(SubscriptionContext)
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider')
  }
  return context
}
