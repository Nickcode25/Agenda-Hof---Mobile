import { useState, FormEvent } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Loader2, User, Lock, Eye, EyeOff } from 'lucide-react'

export function LoginPage() {
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
      <div className="absolute bottom-0 left-0 right-0 h-36">
        <svg viewBox="0 0 400 150" className="w-full h-full" preserveAspectRatio="none">
          <path
            d="M0,40 C60,60 120,20 200,40 C280,60 340,30 400,50 L400,150 L0,150 Z"
            fill="#FED7AA"
          />
          <path
            d="M0,65 C80,85 160,45 240,70 C300,90 360,60 400,75 L400,150 L0,150 Z"
            fill="#FDBA74"
          />
          <path
            d="M0,90 C100,115 180,80 260,100 C320,115 370,95 400,105 L400,150 L0,150 Z"
            fill="#FB923C"
          />
          <path
            d="M0,115 C80,130 160,110 240,125 C300,137 350,123 400,130 L400,150 L0,150 Z"
            fill="#F97316"
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
        </form>
      </div>
    </div>
  )
}
