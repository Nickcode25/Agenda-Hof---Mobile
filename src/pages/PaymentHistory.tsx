import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Header } from '@/components/layout/Header'
import { Loading } from '@/components/ui/Loading'
import { CreditCard, Calendar } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface PaymentHistory {
  id: string
  amount: number
  status: string
  payment_method: string
  card_brand: string | null
  card_last_digits: string | null
  description: string | null
  created_at: string
}

export function PaymentHistoryPage() {
  const { user } = useAuth()
  const [payments, setPayments] = useState<PaymentHistory[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchPaymentHistory()
    }
  }, [user])

  const fetchPaymentHistory = async () => {
    if (!user) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('payment_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Erro ao buscar histórico:', error)
      }

      if (data) setPayments(data)
    } catch (err) {
      console.error('Erro ao buscar pagamentos:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatShortDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), "dd/MM/yyyy", { locale: ptBR })
    } catch {
      return '-'
    }
  }

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
      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${styles[status] || styles.pending}`}>
        {labels[status] || status}
      </span>
    )
  }

  const getPaymentMethodDisplay = (payment: PaymentHistory) => {
    if (payment.card_brand && payment.card_last_digits) {
      return `${payment.card_brand.toUpperCase()} ****${payment.card_last_digits}`
    }
    if (payment.payment_method === 'CREDIT_CARD') {
      return 'Cartao de Credito'
    }
    return payment.payment_method || 'Cartao'
  }

  if (loading) {
    return <Loading fullScreen text="Carregando historico..." />
  }

  return (
    <div className="min-h-screen bg-surface-50 pb-24">
      <Header
        title="Historico de Pagamentos"
        showBack
      />

      <div className="px-4 py-6 space-y-4">
        {/* Lista de Pagamentos */}
        <section>

          {payments.length === 0 ? (
            <div className="card text-center py-8">
              <CreditCard className="w-12 h-12 text-surface-300 mx-auto mb-3" />
              <p className="text-surface-500 font-medium">Nenhum pagamento encontrado</p>
              <p className="text-sm text-surface-400 mt-1">
                Seus pagamentos aparecerao aqui
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="card"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <p className="font-semibold text-surface-900 text-lg">
                        R$ {payment.amount.toFixed(2).replace('.', ',')}
                      </p>
                      {payment.description && (
                        <p className="text-sm text-surface-600 mt-0.5">
                          {payment.description}
                        </p>
                      )}
                    </div>
                    {getStatusBadge(payment.status)}
                  </div>

                  <div className="flex items-center justify-between text-sm border-t border-surface-100 pt-3">
                    <div className="flex items-center gap-2 text-surface-500">
                      <Calendar className="w-4 h-4" />
                      <span>{formatShortDate(payment.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-surface-500">
                      <CreditCard className="w-4 h-4" />
                      <span>{getPaymentMethodDisplay(payment)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
