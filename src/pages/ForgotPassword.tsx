import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Mail, Loader2, CheckCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email) {
      setError('Digite seu email')
      return
    }

    setLoading(true)

    try {
      // No app nativo usa o scheme, no browser usa a URL normal
      const isNative = window.location.protocol === 'capacitor:'
      const redirectUrl = isNative
        ? 'agendahof://reset-password'
        : `${window.location.origin}/reset-password`

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl
      })

      if (error) {
        throw error
      }

      setSuccess(true)
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar email de recuperação.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex flex-col bg-surface-100 pt-safe-top pb-safe-bottom">
        <div className="flex-1 flex flex-col justify-center px-6">
          <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold text-surface-800 mb-3">Email enviado!</h1>
            <p className="text-surface-500 mb-8">
              Se o email existir em nossa base, você receberá um link para redefinir sua senha.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="w-full bg-orange-500 text-white font-semibold py-4 px-6 rounded-full shadow-lg shadow-orange-500/30 active:scale-[0.98] transition-transform"
            >
              Voltar para o login
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-surface-100 pt-safe-top pb-safe-bottom relative overflow-hidden">
      {/* Wave decoration at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-48">
        <svg viewBox="0 0 400 200" className="w-full h-full" preserveAspectRatio="none">
          <path
            d="M0,80 Q100,40 200,80 T400,80 L400,200 L0,200 Z"
            fill="#FFEDD5"
          />
          <path
            d="M0,100 Q100,60 200,100 T400,100 L400,200 L0,200 Z"
            fill="#FDBA74"
          />
          <path
            d="M0,120 Q100,80 200,120 T400,120 L400,200 L0,200 Z"
            fill="#FB923C"
          />
          <path
            d="M0,140 Q100,100 200,140 T400,140 L400,200 L0,200 Z"
            fill="#F97316"
          />
          <path
            d="M0,160 Q100,125 200,160 T400,160 L400,200 L0,200 Z"
            fill="#EA580C"
          />
        </svg>
      </div>

      {/* Header */}
      <div className="px-4 py-4">
        <button
          onClick={() => navigate('/login')}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-sm"
        >
          <ArrowLeft className="w-5 h-5 text-surface-600" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col justify-center px-6 relative z-10 pb-52">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
            <Mail className="w-8 h-8 text-orange-500" />
          </div>
          <h1 className="text-2xl font-bold text-surface-800 text-center">Esqueceu a senha?</h1>
          <p className="text-surface-400 mt-2 text-sm text-center max-w-xs">
            Digite seu email e enviaremos um link para você redefinir sua senha.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-3 bg-white rounded-xl px-4 py-3.5 border border-surface-200">
            <Mail className="w-5 h-5 text-orange-500 flex-shrink-0" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 bg-transparent text-surface-800 placeholder-surface-400 focus:outline-none text-base"
              placeholder="seu@email.com"
              autoComplete="email"
              required
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 text-white font-semibold py-4 px-6 rounded-full disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-orange-500/30 active:scale-[0.98] transition-transform"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Enviando...
              </>
            ) : (
              'Enviar link de recuperação'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
