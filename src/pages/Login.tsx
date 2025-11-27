import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Loader2, User, Lock, Eye, EyeOff } from 'lucide-react'

export function LoginPage() {
  const navigate = useNavigate()
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await signIn(email, password)

    if (error) {
      setError('Email ou senha incorretos')
      setLoading(false)
    }
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

      {/* Content Container */}
      <div className="flex-1 flex flex-col justify-center px-6 relative z-10 pb-36 sm:pb-40">
        {/* Logo Section */}
        <div className="flex flex-col items-center mb-6 sm:mb-8">
          <div className="w-28 h-28 sm:w-32 sm:h-32">
            <img src="/logo.png" alt="Agenda HOF" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-surface-800 mt-4 sm:mt-5 text-xl sm:text-2xl font-bold text-center">Bem-vindo de volta!</h1>
          <p className="text-surface-400 mt-1 sm:mt-1.5 text-sm text-center">A sua clínica a um toque de distância.</p>
        </div>

        {/* Form Section */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Email Input */}
          <div className="flex items-center gap-3 bg-white rounded-xl px-4 py-3.5 border border-surface-200">
            <User className="w-5 h-5 text-orange-500 flex-shrink-0" />
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

          {/* Password Input */}
          <div className="flex items-center gap-3 bg-white rounded-xl px-4 py-3.5 border border-surface-200">
            <Lock className="w-5 h-5 text-orange-500 flex-shrink-0" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="flex-1 bg-transparent text-surface-800 placeholder-surface-400 focus:outline-none text-base"
              placeholder="••••••••••"
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-surface-400 flex-shrink-0"
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>

          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}

          {/* Forgot Password */}
          <div className="text-right pt-1">
            <button
              type="button"
              onClick={() => navigate('/forgot-password')}
              className="text-orange-500 text-sm font-medium"
            >
              Esqueceu a senha?
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 text-white font-semibold py-4 px-6 rounded-full disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-orange-500/30 active:scale-[0.98] transition-transform"
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

          {/* Register Link */}
          <p className="text-center text-surface-500 text-sm pt-2">
            Não tem uma conta?{' '}
            <button
              type="button"
              onClick={() => navigate('/register')}
              className="text-orange-500 font-medium"
            >
              Cadastre-se
            </button>
          </p>
        </form>
      </div>
    </div>
  )
}
