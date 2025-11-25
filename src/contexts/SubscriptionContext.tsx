import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { differenceInDays, parseISO } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { useAuth } from './AuthContext'

const TRIAL_DAYS = 7

export interface Subscription {
  id: string
  user_id: string
  status: 'active' | 'cancelled' | 'suspended' | 'pending'
  plan_amount: string
  billing_cycle: string
  next_billing_date: string
  last_payment_date: string | null
  mercadopago_subscription_id: string | null
  discount_percentage: number | null
  started_at: string
  cancelled_at: string | null
}

interface SubscriptionContextType {
  subscription: Subscription | null
  loading: boolean
  isActive: boolean
  isOnTrial: boolean
  trialDaysLeft: number
  trialExpired: boolean
  planName: string
  refetch: () => Promise<void>
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined)

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchSubscription = async () => {
    if (!user) {
      setSubscription(null)
      setLoading(false)
      return
    }

    setLoading(true)

    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      // Se não encontrou assinatura ativa, tenta buscar qualquer uma para mostrar status
      const { data: anySubscription } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      setSubscription(anySubscription as Subscription | null)
    } else {
      setSubscription(data as Subscription)
    }

    setLoading(false)
  }

  useEffect(() => {
    fetchSubscription()
  }, [user])

  // Calcular dias desde a criação da conta para o trial
  const calculateTrialStatus = () => {
    if (!user?.created_at) {
      return { isOnTrial: false, trialDaysLeft: 0, trialExpired: false }
    }

    const createdAt = parseISO(user.created_at)
    const daysSinceCreation = differenceInDays(new Date(), createdAt)
    const daysLeft = Math.max(0, TRIAL_DAYS - daysSinceCreation)
    const isOnTrial = daysSinceCreation < TRIAL_DAYS
    const trialExpired = daysSinceCreation >= TRIAL_DAYS

    return { isOnTrial, trialDaysLeft: daysLeft, trialExpired }
  }

  const { isOnTrial, trialDaysLeft, trialExpired } = calculateTrialStatus()

  // Determinar se a assinatura está ativa (tem plano pago OU está no trial)
  const hasActiveSubscription = subscription?.status === 'active'
  const isActive = hasActiveSubscription || isOnTrial

  // Determinar nome do plano baseado no valor
  const getPlanName = (amount: string | undefined): string => {
    if (!amount) return 'Sem plano'
    const value = parseFloat(amount)
    if (value <= 49.90) return 'Plano Básico'
    if (value <= 79.90) return 'Plano Pro'
    return 'Plano Premium'
  }

  const planName = hasActiveSubscription
    ? getPlanName(subscription?.plan_amount)
    : isOnTrial
      ? `Período de teste (${trialDaysLeft} dias restantes)`
      : 'Sem plano'

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
        refetch: fetchSubscription,
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
