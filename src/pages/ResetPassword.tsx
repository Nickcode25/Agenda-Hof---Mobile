import { useState, useEffect, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, Eye, EyeOff, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [tokenError, setTokenError] = useState('')

  useEffect(() => {
    // Verifica se há token válido na URL
    const hashParams = new URLSearchParams(window.location.hash.substring(1))
    const accessToken = hashParams.get('access_token')
    const type = hashParams.get('type')
    const errorCode = hashParams.get('error_code')

    if (errorCode === 'otp_expired') {
      setTokenError('Link expirado. Solicite um novo email de recuperação.')
    } else if (!accessToken || type !== 'recovery') {
      setTokenError('Link inválido ou expirado.')
    }
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (!password) {
      setError('Digite a nova senha')
      return
    }

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres')
      return
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      })

      if (error) throw error

      setSuccess(true)
      setTimeout(() => navigate('/login'), 3000)
    } catch (err: any) {
      setError(err.message || 'Erro ao redefinir senha.')
    } finally {
      setLoading(false)
    }
  }

  if (tokenError) {
    return (
      <div className="min-h-screen flex flex-col bg-surface-100 pt-safe-top pb-safe-bottom">
        <div className="flex-1 flex flex-col justify-center px-6">
          <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
              <AlertCircle className="w-10 h-10 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-surface-800 mb-3">Link inválido</h1>
            <p className="text-surface-500 mb-8">{tokenError}</p>
            <button
              onClick={() => navigate('/forgot-password')}
              className="w-full bg-primary-500 text-white font-semibold py-4 px-6 rounded-full shadow-lg shadow-primary-500/30 active:scale-[0.98] transition-transform"
            >
              Solicitar novo link
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex flex-col bg-surface-100 pt-safe-top pb-safe-bottom">
        <div className="flex-1 flex flex-col justify-center px-6">
          <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold text-surface-800 mb-3">Senha redefinida!</h1>
            <p className="text-surface-500 mb-8">
              Sua senha foi alterada com sucesso. Você será redirecionado para o login...
            </p>
            <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
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

      {/* Content */}
      <div className="flex-1 flex flex-col justify-center px-6 relative z-10 pb-52">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-primary-500" />
          </div>
          <h1 className="text-2xl font-bold text-surface-800 text-center">Nova senha</h1>
          <p className="text-surface-400 mt-2 text-sm text-center max-w-xs">
            Digite sua nova senha abaixo.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* New Password */}
          <div className="flex items-center gap-3 bg-white rounded-xl px-4 py-3.5 border border-surface-200">
            <Lock className="w-5 h-5 text-primary-500 flex-shrink-0" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="flex-1 bg-transparent text-surface-800 placeholder-surface-400 focus:outline-none text-base"
              placeholder="Nova senha"
              autoComplete="new-password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-surface-400 flex-shrink-0"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          {/* Confirm Password */}
          <div className="flex items-center gap-3 bg-white rounded-xl px-4 py-3.5 border border-surface-200">
            <Lock className="w-5 h-5 text-primary-500 flex-shrink-0" />
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="flex-1 bg-transparent text-surface-800 placeholder-surface-400 focus:outline-none text-base"
              placeholder="Confirmar nova senha"
              autoComplete="new-password"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="text-surface-400 flex-shrink-0"
            >
              {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-500 text-white font-semibold py-4 px-6 rounded-full disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-primary-500/30 active:scale-[0.98] transition-transform mt-4"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Salvando...
              </>
            ) : (
              'Redefinir senha'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
