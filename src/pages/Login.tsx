import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Loader2, Mail, Lock, Eye, EyeOff } from 'lucide-react'

export function LoginPage() {
  const navigate = useNavigate()
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [focusedField, setFocusedField] = useState<'email' | 'password' | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { error } = await signIn(email, password)

      if (error) {
        // Mostrar erro real para debug
        const errorMsg = error.message || 'Erro desconhecido'
        if (errorMsg.includes('Invalid login credentials')) {
          setError('Email ou senha incorretos')
        } else if (errorMsg.includes('Load failed') || errorMsg.includes('fetch')) {
          setError('Erro de conexão. Verifique sua internet.')
        } else {
          setError(`Erro: ${errorMsg}`)
        }
        setLoading(false)
      }
    } catch (err: any) {
      setError(`Exceção: ${err?.message || 'Erro desconhecido'}`)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-white pb-safe-bottom relative overflow-hidden">
      {/* Safe area top com cor de fundo */}
      <div className="h-safe-top bg-white" />
      {/* Simplified wave decoration at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none">
        <svg viewBox="0 0 400 120" className="w-full h-full" preserveAspectRatio="none">
          <path
            d="M0,40 Q100,20 200,40 T400,40 L400,120 L0,120 Z"
            fill="#FFF7ED"
          />
          <path
            d="M0,60 Q100,35 200,60 T400,60 L400,120 L0,120 Z"
            fill="#FFEDD5"
          />
          <path
            d="M0,80 Q100,55 200,80 T400,80 L400,120 L0,120 Z"
            fill="#FB923C"
          />
        </svg>
      </div>

      {/* Content Container */}
      <div className="flex-1 flex flex-col justify-center px-8 relative z-10 pb-32">
        {/* Logo Section */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-24 h-24">
            <img src="/logo.png" alt="Agenda HOF" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-surface-900 mt-6 text-2xl font-semibold text-center tracking-tight">
            Bem-vindo
          </h1>
          <p className="text-surface-400 mt-2 text-sm text-center font-light">
            A sua clínica a um toque de distância.
          </p>
        </div>

        {/* Form Section */}
        <form onSubmit={handleSubmit} className="space-y-1">
          {/* Email Input - iOS Style with bottom border */}
          <div
            className={`flex items-center gap-3 py-3.5 border-b-[0.5px] transition-colors ${
              focusedField === 'email' ? 'border-primary-500' : 'border-surface-200'
            }`}
          >
            <Mail className="w-5 h-5 text-surface-400 flex-shrink-0" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
              className="flex-1 bg-transparent text-surface-900 placeholder-surface-400 focus:outline-none text-[16px]"
              placeholder="seu@email.com"
              autoComplete="email"
              required
            />
          </div>

          {/* Password Input - iOS Style with bottom border */}
          <div
            className={`flex items-center gap-3 py-3.5 border-b-[0.5px] transition-colors ${
              focusedField === 'password' ? 'border-primary-500' : 'border-surface-200'
            }`}
          >
            <Lock className="w-5 h-5 text-surface-400 flex-shrink-0" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
              className="flex-1 bg-transparent text-surface-900 placeholder-surface-400 focus:outline-none text-[16px]"
              placeholder="Senha"
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-surface-400 flex-shrink-0 p-1 -mr-1"
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>

          {error && (
            <p className="text-error text-sm text-center pt-3">{error}</p>
          )}

          {/* Submit Button - iOS rounded rectangle style */}
          <div className="pt-8">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-500 text-white font-semibold py-4 px-6 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2 active:bg-primary-600 transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </button>
          </div>

          {/* Forgot Password - below button, subtle */}
          <div className="text-center pt-4">
            <button
              type="button"
              onClick={() => navigate('/forgot-password')}
              className="text-primary-500 text-sm font-medium"
            >
              Esqueceu a senha?
            </button>
          </div>

          {/* Register Link */}
          <p className="text-center text-surface-500 text-sm pt-6">
            Não tem uma conta?{' '}
            <button
              type="button"
              onClick={() => navigate('/register')}
              className="text-primary-500 font-semibold"
            >
              Cadastre-se
            </button>
          </p>
        </form>
      </div>
    </div>
  )
}
