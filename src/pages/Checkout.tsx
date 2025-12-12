import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useSubscription } from '@/contexts/SubscriptionContext'
import { supabase } from '@/lib/supabase'
import { Header } from '@/components/layout/Header'
import { Loading } from '@/components/ui/Loading'
import {
  CreditCard,
  Lock,
  Tag,
  Check,
  AlertCircle,
  X
} from 'lucide-react'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js'
import { type Plan, determinePlanTypeByName } from './SelectPlan'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL
const STRIPE_PUBLIC_KEY = import.meta.env.VITE_STRIPE_PUBLIC_KEY
const MINIMUM_SUBSCRIPTION_VALUE = 10.00

// Inicializar Stripe
const stripePromise = STRIPE_PUBLIC_KEY ? loadStripe(STRIPE_PUBLIC_KEY) : null

interface Coupon {
  id: string
  code: string
  discount_percentage: number
}

// Estilos para os elementos do Stripe
const elementStyle = {
  base: {
    fontSize: '16px',
    color: '#1a1a1a',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    '::placeholder': {
      color: '#9ca3af',
    },
  },
  invalid: {
    color: '#ef4444',
  },
}

// Componente interno do formulario de pagamento
function CheckoutForm({ plan, onSuccess }: { plan: Plan; onSuccess: () => void }) {
  const stripe = useStripe()
  const elements = useElements()
  const { user } = useAuth()
  const { refetch: refetchSubscription } = useSubscription()

  // Estados do formulario
  const [cardholderName, setCardholderName] = useState('')

  // Estados de cupom
  const [couponCode, setCouponCode] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null)
  const [loadingCoupon, setLoadingCoupon] = useState(false)
  const [couponError, setCouponError] = useState('')

  // Estados de processamento
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')

  // Estados de validacao dos elementos Stripe
  const [cardNumberComplete, setCardNumberComplete] = useState(false)
  const [cardExpiryComplete, setCardExpiryComplete] = useState(false)
  const [cardCvcComplete, setCardCvcComplete] = useState(false)

  // Calcular preco final
  const calculateFinalPrice = () => {
    if (!plan) return 0
    if (!appliedCoupon) return plan.price

    const discountedPrice = plan.price * (1 - appliedCoupon.discount_percentage / 100)
    return Math.max(MINIMUM_SUBSCRIPTION_VALUE, Math.round(discountedPrice * 100) / 100)
  }

  const finalPrice = calculateFinalPrice()
  const discount = plan ? plan.price - finalPrice : 0

  // Validar formulario
  const isFormValid = () => {
    return (
      cardholderName.length >= 3 &&
      cardNumberComplete &&
      cardExpiryComplete &&
      cardCvcComplete
    )
  }

  // Aplicar cupom
  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return

    setLoadingCoupon(true)
    setCouponError('')

    try {
      const { data, error } = await supabase
        .from('discount_coupons')
        .select('*')
        .eq('code', couponCode.toUpperCase())
        .eq('is_active', true)
        .single()

      if (error || !data) {
        setCouponError('Cupom invalido ou expirado')
        return
      }

      // Validar data de expiracao
      if (data.valid_until && new Date(data.valid_until) < new Date()) {
        setCouponError('Este cupom expirou')
        return
      }

      // Validar limite de usos
      if (data.max_uses && data.current_uses >= data.max_uses) {
        setCouponError('Este cupom atingiu o limite de usos')
        return
      }

      setAppliedCoupon({
        id: data.id,
        code: data.code,
        discount_percentage: data.discount_percentage
      })
      setCouponCode('')
    } catch (err) {
      setCouponError('Erro ao validar cupom')
    } finally {
      setLoadingCoupon(false)
    }
  }

  // Remover cupom
  const handleRemoveCoupon = () => {
    setAppliedCoupon(null)
    setCouponError('')
  }

  // Criar assinatura no backend via Stripe
  // O backend cria a subscription no Stripe e salva no payment_history
  // Após sucesso, o frontend salva na tabela user_subscriptions
  const createStripeSubscription = async (paymentMethodId: string) => {
    // IMPORTANTE: Usar o NOME/TYPE do plano, não o preço com desconto
    const planType = plan?.type || determinePlanTypeByName(plan?.name || '')

    const response = await fetch(`${BACKEND_URL}/api/stripe/create-subscription`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        // Dados do cliente
        customerEmail: user?.email,
        customerName: user?.user_metadata?.full_name || cardholderName,
        customerId: user?.id,

        // Método de pagamento
        paymentMethodId: paymentMethodId,

        // Dados do plano - ENVIAR PREÇO COM DESCONTO para cobrança
        amount: finalPrice,

        // Metadados do plano - para rastreabilidade
        planName: `Agenda HOF - ${plan?.name}`,
        planId: plan?.id,
        planType: planType, // basic, pro, premium
        originalAmount: plan?.price, // Preço original SEM desconto

        // Cupom de desconto
        couponId: appliedCoupon?.id || null,
        discountPercentage: appliedCoupon?.discount_percentage || 0
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Erro ao criar assinatura')
    }

    return response.json()
  }

  // Salvar assinatura no Supabase
  // O backend já salva no payment_history via webhook/diretamente
  // Aqui salvamos na tabela user_subscriptions que é a fonte principal do app
  const saveSubscriptionToSupabase = async (subscriptionData: any) => {
    // IMPORTANTE: Usar o NOME/TYPE do plano para determinar o tipo, não o preço
    // Isso evita bugs quando cupons de desconto são aplicados
    const planType = plan?.type || determinePlanTypeByName(plan?.name || '')

    // Usar a data de próxima cobrança retornada pelo backend (mais precisa)
    // ou calcular 30 dias a partir de hoje como fallback
    const nextBillingDate = subscriptionData.nextBillingDate
      ? new Date(subscriptionData.nextBillingDate)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

    // Inserir assinatura na tabela user_subscriptions
    const { error } = await supabase.from('user_subscriptions').insert({
      user_id: user?.id,
      status: subscriptionData.status || 'active',

      // Dados do plano - SALVAR TIPO E NOME, não depender do preço
      plan_type: planType, // basic, pro, premium
      plan_name: plan?.name || '', // Nome completo do plano (Básico, Profissional, Premium)
      plan_amount: plan?.price || 0, // Preço ORIGINAL (sem desconto)
      discount_percentage: appliedCoupon?.discount_percentage || 0,

      // Dados de cobrança
      billing_cycle: 'MONTHLY',
      next_billing_date: nextBillingDate.toISOString(),

      // Dados do cartão (retornados pelo backend)
      payment_method: 'CREDIT_CARD',
      card_last_digits: subscriptionData.cardLastDigits || null,
      card_brand: subscriptionData.cardBrand || null,

      // IDs do Stripe (para sincronização com webhooks)
      stripe_subscription_id: subscriptionData.subscriptionId || null,
      stripe_customer_id: subscriptionData.customerId || null,

      // Timestamps
      started_at: new Date().toISOString()
    })

    if (error) {
      console.error('Erro ao salvar assinatura:', error)
      throw new Error('Erro ao salvar assinatura: ' + error.message)
    }

    // NOTA: O histórico de pagamentos é salvo pelo backend via webhook
    // Não precisamos duplicar aqui
  }

  // Processar pagamento
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements || !isFormValid() || !plan || !user) return

    setProcessing(true)
    setError('')

    try {
      // 1. Criar PaymentMethod usando Stripe Elements
      const cardNumberElement = elements.getElement(CardNumberElement)
      if (!cardNumberElement) {
        throw new Error('Erro ao carregar formulario de cartao')
      }

      const { paymentMethod, error: pmError } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardNumberElement,
        billing_details: {
          name: cardholderName,
          email: user?.email
        }
      })

      if (pmError || !paymentMethod) {
        throw new Error(pmError?.message || 'Erro ao processar cartao')
      }

      // 2. Criar assinatura no backend
      const subscriptionData = await createStripeSubscription(paymentMethod.id)

      // 3. Verificar se foi aprovado
      if (!subscriptionData.success) {
        throw new Error(subscriptionData.error || 'Pagamento nao aprovado. Verifique os dados do cartao.')
      }

      // 4. Salvar no Supabase
      await saveSubscriptionToSupabase(subscriptionData)

      // 5. Atualizar contexto de assinatura
      await refetchSubscription()

      // 6. Chamar callback de sucesso
      onSuccess()

    } catch (err: any) {
      console.error('Erro no pagamento:', err)
      setError(err.message || 'Erro ao processar pagamento. Tente novamente.')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="px-4 py-6 space-y-4">
      {/* Resumo do Plano */}
      <section className="card">
        <h3 className="font-semibold text-surface-900 mb-3">Resumo do Pedido</h3>
        <div className="flex items-center justify-between mb-2">
          <span className="text-surface-600">{plan.name}</span>
          <span className="text-surface-900">R$ {plan.price.toFixed(2).replace('.', ',')}</span>
        </div>
        {appliedCoupon && (
          <div className="flex items-center justify-between text-green-600 mb-2">
            <span>Desconto ({appliedCoupon.discount_percentage}%)</span>
            <span>- R$ {discount.toFixed(2).replace('.', ',')}</span>
          </div>
        )}
        <div className="border-t border-surface-100 pt-2 mt-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-surface-900">Total/mes</span>
            <span className="text-xl font-bold text-primary-500">
              R$ {finalPrice.toFixed(2).replace('.', ',')}
            </span>
          </div>
        </div>
      </section>

      {/* Cupom de Desconto */}
      <section className="card">
        <div className="flex items-center gap-2 mb-3">
          <Tag className="w-5 h-5 text-primary-500" />
          <h3 className="font-semibold text-surface-900">Cupom de Desconto</h3>
        </div>

        {appliedCoupon ? (
          <div className="flex items-center justify-between bg-green-50 p-3 rounded-xl">
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-green-500" />
              <span className="font-medium text-green-700">
                {appliedCoupon.code} (-{appliedCoupon.discount_percentage}%)
              </span>
            </div>
            <button type="button" onClick={handleRemoveCoupon} className="text-surface-400">
              <X className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              placeholder="Digite o cupom"
              className="input flex-1"
            />
            <button
              type="button"
              onClick={handleApplyCoupon}
              disabled={loadingCoupon || !couponCode.trim()}
              className="px-4 py-2 bg-surface-100 text-surface-700 rounded-xl font-medium disabled:opacity-50"
            >
              {loadingCoupon ? '...' : 'Aplicar'}
            </button>
          </div>
        )}

        {couponError && (
          <p className="text-red-500 text-sm mt-2">{couponError}</p>
        )}
      </section>

      {/* Dados do Cartao */}
      <section className="card">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard className="w-5 h-5 text-primary-500" />
          <h3 className="font-semibold text-surface-900">Dados do Cartao</h3>
        </div>

        <div className="space-y-4">
          {/* Numero do Cartao - Stripe Element */}
          <div>
            <label className="block text-sm font-medium text-surface-600 mb-1">
              Numero do Cartao
            </label>
            <div className="input py-3">
              <CardNumberElement
                options={{ style: elementStyle }}
                onChange={(e) => setCardNumberComplete(e.complete)}
              />
            </div>
          </div>

          {/* Nome no Cartao */}
          <div>
            <label className="block text-sm font-medium text-surface-600 mb-1">
              Nome no Cartao
            </label>
            <input
              type="text"
              value={cardholderName}
              onChange={(e) => setCardholderName(e.target.value.toUpperCase())}
              placeholder="NOME COMO ESTA NO CARTAO"
              className="input"
            />
          </div>

          {/* Validade e CVV - Stripe Elements */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-surface-600 mb-1">
                Validade
              </label>
              <div className="input py-3">
                <CardExpiryElement
                  options={{ style: elementStyle }}
                  onChange={(e) => setCardExpiryComplete(e.complete)}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-600 mb-1">
                CVV
              </label>
              <div className="input py-3">
                <CardCvcElement
                  options={{ style: elementStyle }}
                  onChange={(e) => setCardCvcComplete(e.complete)}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Erro */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-700">Erro no pagamento</p>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
      )}

      {/* Botao de Pagamento */}
      <button
        type="submit"
        disabled={!isFormValid() || processing || !stripe}
        className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {processing ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Processando...
          </>
        ) : (
          <>
            <Lock className="w-5 h-5" />
            Assinar por R$ {finalPrice.toFixed(2).replace('.', ',')}/mes
          </>
        )}
      </button>

      {/* Seguranca */}
      <div className="flex items-center justify-center gap-2 text-surface-400 text-xs">
        <Lock className="w-4 h-4" />
        <span>Pagamento seguro processado pelo Stripe</span>
      </div>
    </form>
  )
}

// Componente principal da pagina
export function CheckoutPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const plan = location.state?.plan as Plan | undefined

  const [success, setSuccess] = useState(false)

  // Redirecionar se nao houver plano selecionado
  useEffect(() => {
    if (!plan) {
      navigate('/select-plan')
    }
  }, [plan, navigate])

  // Handler de sucesso
  const handleSuccess = () => {
    setSuccess(true)
    setTimeout(() => {
      navigate('/my-subscription')
    }, 2000)
  }

  if (!plan) {
    return <Loading fullScreen text="Carregando..." />
  }

  if (!STRIPE_PUBLIC_KEY) {
    return (
      <div className="min-h-screen bg-surface-50 flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-surface-900 mb-2">
            Erro de Configuracao
          </h1>
          <p className="text-surface-500">
            Chave publica do Stripe nao configurada.
          </p>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-surface-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-surface-900 mb-2">
            Pagamento Aprovado!
          </h1>
          <p className="text-surface-500">
            Sua assinatura foi ativada com sucesso.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface-50 pb-24">
      <Header
        title="Finalizar Assinatura"
        showBack
      />

      <Elements stripe={stripePromise}>
        <CheckoutForm plan={plan} onSuccess={handleSuccess} />
      </Elements>
    </div>
  )
}
