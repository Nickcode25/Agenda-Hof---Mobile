import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useSubscription } from '@/contexts/SubscriptionContext'
import { supabase } from '@/lib/supabase'
import { Header } from '@/components/layout/Header'
import { Loading } from '@/components/ui/Loading'
import {
  ChevronLeft,
  CreditCard,
  Lock,
  Tag,
  Check,
  AlertCircle,
  X
} from 'lucide-react'
import type { Plan } from './SelectPlan'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL
const MERCADOPAGO_PUBLIC_KEY = import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY || ''
const MINIMUM_SUBSCRIPTION_VALUE = 10.00

interface CardData {
  cardNumber: string
  cardholderName: string
  expirationMonth: string
  expirationYear: string
  securityCode: string
  cpf: string
}

interface Coupon {
  id: string
  code: string
  discount_percentage: number
}

export function CheckoutPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const { refetch: refetchSubscription } = useSubscription()

  const plan = location.state?.plan as Plan | undefined

  // Estados do formulário
  const [cardData, setCardData] = useState<CardData>({
    cardNumber: '',
    cardholderName: '',
    expirationMonth: '',
    expirationYear: '',
    securityCode: '',
    cpf: ''
  })

  // Estados de cupom
  const [couponCode, setCouponCode] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null)
  const [loadingCoupon, setLoadingCoupon] = useState(false)
  const [couponError, setCouponError] = useState('')

  // Estados de processamento
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Redirecionar se não houver plano selecionado
  useEffect(() => {
    if (!plan) {
      navigate('/select-plan')
    }
  }, [plan, navigate])

  // Calcular preço final
  const calculateFinalPrice = () => {
    if (!plan) return 0
    if (!appliedCoupon) return plan.price

    const discountedPrice = plan.price * (1 - appliedCoupon.discount_percentage / 100)
    return Math.max(MINIMUM_SUBSCRIPTION_VALUE, Math.round(discountedPrice * 100) / 100)
  }

  const finalPrice = calculateFinalPrice()
  const discount = plan ? plan.price - finalPrice : 0

  // Formatar número do cartão
  const formatCardNumber = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    const groups = numbers.match(/.{1,4}/g) || []
    return groups.join(' ').substring(0, 19)
  }

  // Formatar CPF
  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    if (numbers.length <= 3) return numbers
    if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`
    if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`
  }

  // Validar formulário
  const isFormValid = () => {
    const cardNumbers = cardData.cardNumber.replace(/\D/g, '')
    const cpfNumbers = cardData.cpf.replace(/\D/g, '')

    return (
      cardNumbers.length >= 15 &&
      cardData.cardholderName.length >= 3 &&
      cardData.expirationMonth.length === 2 &&
      cardData.expirationYear.length === 4 &&
      cardData.securityCode.length >= 3 &&
      cpfNumbers.length === 11
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
        setCouponError('Cupom inválido ou expirado')
        return
      }

      // Validar data de expiração
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

  // Criar token do cartão via API do Mercado Pago
  const createCardToken = async (): Promise<string> => {
    const cardNumbers = cardData.cardNumber.replace(/\D/g, '')
    const cpfNumbers = cardData.cpf.replace(/\D/g, '')

    const response = await fetch(
      `https://api.mercadopago.com/v1/card_tokens?public_key=${MERCADOPAGO_PUBLIC_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          card_number: cardNumbers,
          cardholder: {
            name: cardData.cardholderName.toUpperCase(),
            identification: {
              type: 'CPF',
              number: cpfNumbers
            }
          },
          expiration_month: parseInt(cardData.expirationMonth),
          expiration_year: parseInt(cardData.expirationYear),
          security_code: cardData.securityCode
        })
      }
    )

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Erro ao criar token:', errorData)
      throw new Error('Erro ao processar dados do cartão')
    }

    const data = await response.json()
    return data.id
  }

  // Criar assinatura no backend
  const createSubscription = async (cardToken: string) => {
    const response = await fetch(`${BACKEND_URL}/api/mercadopago/create-subscription`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        customerEmail: user?.email,
        customerName: user?.user_metadata?.name || cardData.cardholderName,
        customerPhone: '',
        customerCpf: cardData.cpf.replace(/\D/g, ''),
        cardToken: cardToken,
        amount: finalPrice,
        planName: `Agenda HOF - ${plan?.name}`,
        couponId: appliedCoupon?.id || null,
        discountPercentage: appliedCoupon?.discount_percentage || null
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Erro ao criar assinatura')
    }

    return response.json()
  }

  // Salvar assinatura no Supabase
  const saveSubscriptionToSupabase = async (subscriptionData: any) => {
    const { error } = await supabase.from('user_subscriptions').insert({
      user_id: user?.id,
      mercadopago_subscription_id: subscriptionData.id,
      status: 'active',
      plan_id: plan?.id,
      plan_amount: finalPrice,
      billing_cycle: 'MONTHLY',
      next_billing_date: subscriptionData.nextBillingDate,
      payment_method: 'CREDIT_CARD',
      card_last_digits: subscriptionData.cardLastDigits,
      card_brand: subscriptionData.cardBrand,
      coupon_id: appliedCoupon?.id || null,
      discount_percentage: appliedCoupon?.discount_percentage || null
    })

    if (error) {
      console.error('Erro ao salvar assinatura:', error)
      throw new Error('Erro ao salvar assinatura')
    }
  }

  // Processar pagamento
  const handleSubmit = async () => {
    if (!isFormValid() || !plan || !user) return

    setProcessing(true)
    setError('')

    try {
      // 1. Criar token do cartão
      const cardToken = await createCardToken()

      // 2. Criar assinatura no backend
      const subscriptionData = await createSubscription(cardToken)

      // 3. Verificar se foi aprovado
      if (subscriptionData.status !== 'authorized' && subscriptionData.status !== 'approved') {
        throw new Error('Pagamento não aprovado. Verifique os dados do cartão.')
      }

      // 4. Salvar no Supabase
      await saveSubscriptionToSupabase(subscriptionData)

      // 5. Atualizar contexto de assinatura
      await refetchSubscription()

      // 6. Mostrar sucesso
      setSuccess(true)

      // 7. Redirecionar após 2 segundos
      setTimeout(() => {
        navigate('/my-subscription')
      }, 2000)
    } catch (err: any) {
      console.error('Erro no pagamento:', err)
      setError(err.message || 'Erro ao processar pagamento. Tente novamente.')
    } finally {
      setProcessing(false)
    }
  }

  if (!plan) {
    return <Loading fullScreen text="Carregando..." />
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
        leftAction={
          <button onClick={() => navigate(-1)} className="p-2 -ml-2">
            <ChevronLeft className="w-6 h-6" />
          </button>
        }
      />

      <div className="px-4 py-6 space-y-4">
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
              <span className="font-semibold text-surface-900">Total/mês</span>
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
              <button onClick={handleRemoveCoupon} className="text-surface-400">
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

        {/* Dados do Cartão */}
        <section className="card">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="w-5 h-5 text-primary-500" />
            <h3 className="font-semibold text-surface-900">Dados do Cartão</h3>
          </div>

          <div className="space-y-4">
            {/* Número do Cartão */}
            <div>
              <label className="block text-sm font-medium text-surface-600 mb-1">
                Número do Cartão
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={formatCardNumber(cardData.cardNumber)}
                onChange={(e) => setCardData({
                  ...cardData,
                  cardNumber: e.target.value.replace(/\D/g, '').slice(0, 16)
                })}
                placeholder="0000 0000 0000 0000"
                className="input"
              />
            </div>

            {/* Nome no Cartão */}
            <div>
              <label className="block text-sm font-medium text-surface-600 mb-1">
                Nome no Cartão
              </label>
              <input
                type="text"
                value={cardData.cardholderName}
                onChange={(e) => setCardData({
                  ...cardData,
                  cardholderName: e.target.value.toUpperCase()
                })}
                placeholder="NOME COMO ESTÁ NO CARTÃO"
                className="input"
              />
            </div>

            {/* Validade e CVV */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-surface-600 mb-1">
                  Mês
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={cardData.expirationMonth}
                  onChange={(e) => setCardData({
                    ...cardData,
                    expirationMonth: e.target.value.replace(/\D/g, '').slice(0, 2)
                  })}
                  placeholder="MM"
                  maxLength={2}
                  className="input text-center"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-600 mb-1">
                  Ano
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={cardData.expirationYear}
                  onChange={(e) => setCardData({
                    ...cardData,
                    expirationYear: e.target.value.replace(/\D/g, '').slice(0, 4)
                  })}
                  placeholder="AAAA"
                  maxLength={4}
                  className="input text-center"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-600 mb-1">
                  CVV
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={cardData.securityCode}
                  onChange={(e) => setCardData({
                    ...cardData,
                    securityCode: e.target.value.replace(/\D/g, '').slice(0, 4)
                  })}
                  placeholder="123"
                  maxLength={4}
                  className="input text-center"
                />
              </div>
            </div>

            {/* CPF */}
            <div>
              <label className="block text-sm font-medium text-surface-600 mb-1">
                CPF do Titular
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={formatCPF(cardData.cpf)}
                onChange={(e) => setCardData({
                  ...cardData,
                  cpf: e.target.value.replace(/\D/g, '').slice(0, 11)
                })}
                placeholder="000.000.000-00"
                className="input"
              />
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

        {/* Botão de Pagamento */}
        <button
          onClick={handleSubmit}
          disabled={!isFormValid() || processing}
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
              Assinar por R$ {finalPrice.toFixed(2).replace('.', ',')}/mês
            </>
          )}
        </button>

        {/* Segurança */}
        <div className="flex items-center justify-center gap-2 text-surface-400 text-xs">
          <Lock className="w-4 h-4" />
          <span>Pagamento seguro processado pelo Mercado Pago</span>
        </div>
      </div>
    </div>
  )
}
