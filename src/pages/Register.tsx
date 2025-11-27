import { useState, FormEvent, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, User, Mail, Lock, Eye, EyeOff, Loader2, CheckCircle, Phone } from 'lucide-react'
import { supabase } from '@/lib/supabase'

// Validação de email
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Typos comuns de email
const commonTypos: Record<string, string> = {
  'gmial.com': 'gmail.com',
  'gmai.com': 'gmail.com',
  'gnail.com': 'gmail.com',
  'hotmial.com': 'hotmail.com',
  'hotnail.com': 'hotmail.com',
  'outlok.com': 'outlook.com',
}

// DDDs válidos do Brasil
const validDDDs = [
  '11', '12', '13', '14', '15', '16', '17', '18', '19', // SP
  '21', '22', '24', // RJ
  '27', '28', // ES
  '31', '32', '33', '34', '35', '37', '38', // MG
  '41', '42', '43', '44', '45', '46', // PR
  '47', '48', '49', // SC
  '51', '53', '54', '55', // RS
  '61', // DF
  '62', '64', // GO
  '63', // TO
  '65', '66', // MT
  '67', // MS
  '68', // AC
  '69', // RO
  '71', '73', '74', '75', '77', // BA
  '79', // SE
  '81', '87', // PE
  '82', // AL
  '83', // PB
  '84', // RN
  '85', '88', // CE
  '86', '89', // PI
  '91', '93', '94', // PA
  '92', '97', // AM
  '95', // RR
  '96', // AP
  '98', '99', // MA
]

// Formatar telefone com máscara
const formatPhone = (value: string): string => {
  const numbers = value.replace(/\D/g, '')
  if (numbers.length <= 2) {
    return numbers
  }
  if (numbers.length <= 6) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`
  }
  if (numbers.length <= 10) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`
  }
  return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`
}

// Validar telefone
const validatePhone = (phone: string): { valid: boolean; error?: string } => {
  const numbers = phone.replace(/\D/g, '')

  if (numbers.length < 10 || numbers.length > 11) {
    return { valid: false, error: 'Telefone deve ter 10 ou 11 dígitos' }
  }

  const ddd = numbers.slice(0, 2)
  if (!validDDDs.includes(ddd)) {
    return { valid: false, error: 'DDD inválido' }
  }

  if (numbers.length === 11 && numbers[2] !== '9') {
    return { valid: false, error: 'Celular deve começar com 9' }
  }

  // Verificar sequências repetidas
  const phoneNumber = numbers.slice(2)
  if (/^(\d)\1+$/.test(phoneNumber)) {
    return { valid: false, error: 'Telefone inválido' }
  }

  return { valid: true }
}

// Validar senha (mínimo 3 de 4 requisitos)
const validatePassword = (password: string): { valid: boolean; error?: string; strength: number } => {
  if (password.length < 8) {
    return { valid: false, error: 'Senha deve ter mínimo 8 caracteres', strength: 0 }
  }

  const hasUpperCase = /[A-Z]/.test(password)
  const hasLowerCase = /[a-z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password)

  const strength = [hasUpperCase, hasLowerCase, hasNumber, hasSpecialChar].filter(Boolean).length

  if (strength < 3) {
    return {
      valid: false,
      error: 'Senha deve ter pelo menos 3: maiúscula, minúscula, número ou caractere especial',
      strength
    }
  }

  return { valid: true, strength }
}

// Corrigir typos de email
const fixEmailTypo = (email: string): string => {
  const [local, domain] = email.split('@')
  if (domain && commonTypos[domain]) {
    return `${local}@${commonTypos[domain]}`
  }
  return email
}

type Step = 'form' | 'verification' | 'success'

export function RegisterPage() {
  const navigate = useNavigate()

  // Form state
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [confirmEmail, setConfirmEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // UI state
  const [step, setStep] = useState<Step>('form')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [emailSuggestion, setEmailSuggestion] = useState('')

  // Verification state
  const [verificationCode, setVerificationCode] = useState('')
  const [inputCode, setInputCode] = useState(['', '', '', '', '', ''])
  const [timeLeft, setTimeLeft] = useState(900) // 15 minutos em segundos
  const [canResend, setCanResend] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Timer para código de verificação
  useEffect(() => {
    if (step !== 'verification') return

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setCanResend(true)
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [step])

  // Formatar tempo restante
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Verificar typo no email
  const handleEmailChange = (value: string) => {
    setEmail(value)
    const fixed = fixEmailTypo(value.toLowerCase())
    if (fixed !== value.toLowerCase() && value.includes('@')) {
      setEmailSuggestion(fixed)
    } else {
      setEmailSuggestion('')
    }
  }

  // Formatar telefone ao digitar
  const handlePhoneChange = (value: string) => {
    const formatted = formatPhone(value)
    setPhone(formatted)
  }

  // Gerar código de verificação
  const generateCode = (): string => {
    return Math.floor(100000 + Math.random() * 900000).toString()
  }

  // Enviar código por email
  const sendVerificationEmail = async (code: string) => {
    const response = await fetch('https://agenda-hof-production.up.railway.app/api/email/send-verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: email.trim().toLowerCase(),
        code: code,
        userName: name.trim()
      })
    })

    if (!response.ok) {
      throw new Error('Erro ao enviar email de verificação')
    }

    return response.json()
  }

  // Validar formulário e enviar código
  const handleSubmitForm = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    // Validar nome
    if (!name.trim()) {
      setError('Digite seu nome')
      return
    }

    // Validar email
    const emailToUse = emailSuggestion || email.trim().toLowerCase()
    if (!emailRegex.test(emailToUse)) {
      setError('Email inválido')
      return
    }

    // Validar confirmação de email
    if (emailToUse !== confirmEmail.trim().toLowerCase()) {
      setError('Os emails não coincidem')
      return
    }

    // Validar telefone
    const phoneValidation = validatePhone(phone)
    if (!phoneValidation.valid) {
      setError(phoneValidation.error || 'Telefone inválido')
      return
    }

    // Validar senha
    const passwordValidation = validatePassword(password)
    if (!passwordValidation.valid) {
      setError(passwordValidation.error || 'Senha inválida')
      return
    }

    // Validar confirmação de senha
    if (password !== confirmPassword) {
      setError('As senhas não coincidem')
      return
    }

    setLoading(true)

    try {
      // Gerar e enviar código
      const code = generateCode()
      await sendVerificationEmail(code)

      // Salvar código e ir para verificação
      setVerificationCode(code)
      setEmail(emailToUse)
      setTimeLeft(900)
      setCanResend(false)
      setStep('verification')
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar email. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  // Handler para input do código
  const handleCodeInput = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return

    const newCode = [...inputCode]
    newCode[index] = value.slice(-1)
    setInputCode(newCode)

    // Auto-focus próximo input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  // Handler para backspace no código
  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !inputCode[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  // Verificar código e criar conta
  const handleVerifyCode = async () => {
    const enteredCode = inputCode.join('')

    if (enteredCode.length !== 6) {
      setError('Digite o código completo')
      return
    }

    if (timeLeft === 0) {
      setError('Código expirado, solicite um novo')
      return
    }

    if (enteredCode !== verificationCode) {
      setError('Código incorreto')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Calcular trial de 7 dias
      const trialEndDate = new Date()
      trialEndDate.setDate(trialEndDate.getDate() + 7)

      // Criar conta no Supabase
      const { error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            full_name: name.trim(),
            phone: phone.replace(/\D/g, ''),
            trial_end_date: trialEndDate.toISOString()
          }
        }
      })

      if (error) {
        if (error.message.includes('already registered')) {
          throw new Error('Este email já está cadastrado')
        }
        throw error
      }

      setStep('success')
    } catch (err: any) {
      setError(err.message || 'Erro ao criar conta.')
    } finally {
      setLoading(false)
    }
  }

  // Reenviar código
  const handleResendCode = async () => {
    if (!canResend) return

    setLoading(true)
    setError('')

    try {
      const code = generateCode()
      await sendVerificationEmail(code)

      setVerificationCode(code)
      setInputCode(['', '', '', '', '', ''])
      setTimeLeft(900)
      setCanResend(false)
    } catch (err: any) {
      setError(err.message || 'Erro ao reenviar código.')
    } finally {
      setLoading(false)
    }
  }

  // Tela de sucesso
  if (step === 'success') {
    return (
      <div className="min-h-screen flex flex-col bg-surface-100 pt-safe-top pb-safe-bottom">
        <div className="flex-1 flex flex-col justify-center px-6">
          <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold text-surface-800 mb-3">Conta criada!</h1>
            <p className="text-surface-500 mb-8">
              Sua conta foi criada com sucesso. Você tem 7 dias de período de teste gratuito.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="w-full bg-orange-500 text-white font-semibold py-4 px-6 rounded-full shadow-lg shadow-orange-500/30 active:scale-[0.98] transition-transform"
            >
              Fazer login
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Tela de verificação de código
  if (step === 'verification') {
    return (
      <div className="min-h-screen flex flex-col bg-surface-100 pt-safe-top pb-safe-bottom relative overflow-hidden">
        {/* Wave decoration */}
        <div className="absolute bottom-0 left-0 right-0 h-48">
          <svg viewBox="0 0 400 200" className="w-full h-full" preserveAspectRatio="none">
            <path d="M0,80 Q100,40 200,80 T400,80 L400,200 L0,200 Z" fill="#FFEDD5" />
            <path d="M0,100 Q100,60 200,100 T400,100 L400,200 L0,200 Z" fill="#FDBA74" />
            <path d="M0,120 Q100,80 200,120 T400,120 L400,200 L0,200 Z" fill="#FB923C" />
            <path d="M0,140 Q100,100 200,140 T400,140 L400,200 L0,200 Z" fill="#F97316" />
            <path d="M0,160 Q100,125 200,160 T400,160 L400,200 L0,200 Z" fill="#EA580C" />
          </svg>
        </div>

        {/* Header */}
        <div className="px-4 py-4">
          <button
            onClick={() => setStep('form')}
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
            <h1 className="text-2xl font-bold text-surface-800 text-center">Verificar email</h1>
            <p className="text-surface-400 mt-2 text-sm text-center max-w-xs">
              Digite o código de 6 dígitos enviado para {email}
            </p>
          </div>

          {/* Code inputs */}
          <div className="flex justify-center gap-2 mb-4">
            {inputCode.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleCodeInput(index, e.target.value)}
                onKeyDown={(e) => handleCodeKeyDown(index, e)}
                className="w-12 h-14 text-center text-2xl font-bold bg-white border border-surface-200 rounded-xl focus:border-orange-500 focus:outline-none"
              />
            ))}
          </div>

          {/* Timer */}
          <p className="text-center text-surface-400 text-sm mb-4">
            {timeLeft > 0 ? (
              <>Código expira em <span className="font-medium text-orange-500">{formatTime(timeLeft)}</span></>
            ) : (
              <span className="text-red-500">Código expirado</span>
            )}
          </p>

          {error && (
            <p className="text-red-500 text-sm text-center mb-4">{error}</p>
          )}

          {/* Verify button */}
          <button
            onClick={handleVerifyCode}
            disabled={loading || inputCode.join('').length !== 6}
            className="w-full bg-orange-500 text-white font-semibold py-4 px-6 rounded-full disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-orange-500/30 active:scale-[0.98] transition-transform"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Verificando...
              </>
            ) : (
              'Verificar código'
            )}
          </button>

          {/* Resend button */}
          <button
            onClick={handleResendCode}
            disabled={!canResend || loading}
            className={`mt-4 text-sm font-medium ${canResend ? 'text-orange-500' : 'text-surface-400'}`}
          >
            {loading ? 'Enviando...' : 'Reenviar código'}
          </button>
        </div>
      </div>
    )
  }

  // Formulário principal
  return (
    <div className="min-h-screen flex flex-col bg-surface-100 pt-safe-top pb-safe-bottom relative overflow-hidden">
      {/* Wave decoration at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-48">
        <svg viewBox="0 0 400 200" className="w-full h-full" preserveAspectRatio="none">
          <path d="M0,80 Q100,40 200,80 T400,80 L400,200 L0,200 Z" fill="#FFEDD5" />
          <path d="M0,100 Q100,60 200,100 T400,100 L400,200 L0,200 Z" fill="#FDBA74" />
          <path d="M0,120 Q100,80 200,120 T400,120 L400,200 L0,200 Z" fill="#FB923C" />
          <path d="M0,140 Q100,100 200,140 T400,140 L400,200 L0,200 Z" fill="#F97316" />
          <path d="M0,160 Q100,125 200,160 T400,160 L400,200 L0,200 Z" fill="#EA580C" />
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
      <div className="flex-1 flex flex-col px-6 relative z-10 pb-52 overflow-y-auto">
        <div className="flex flex-col items-center mb-6">
          <h1 className="text-2xl font-bold text-surface-800 text-center">Criar conta</h1>
          <p className="text-surface-400 mt-2 text-sm text-center">
            Preencha os dados abaixo para começar
          </p>
        </div>

        <form onSubmit={handleSubmitForm} className="space-y-3">
          {/* Name Input */}
          <div className="flex items-center gap-3 bg-white rounded-xl px-4 py-3.5 border border-surface-200">
            <User className="w-5 h-5 text-orange-500 flex-shrink-0" />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 bg-transparent text-surface-800 placeholder-surface-400 focus:outline-none text-base"
              placeholder="Seu nome completo"
              autoComplete="name"
              required
            />
          </div>

          {/* Email Input */}
          <div>
            <div className="flex items-center gap-3 bg-white rounded-xl px-4 py-3.5 border border-surface-200">
              <Mail className="w-5 h-5 text-orange-500 flex-shrink-0" />
              <input
                type="email"
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                className="flex-1 bg-transparent text-surface-800 placeholder-surface-400 focus:outline-none text-base"
                placeholder="seu@email.com"
                autoComplete="email"
                required
              />
            </div>
            {emailSuggestion && (
              <button
                type="button"
                onClick={() => { setEmail(emailSuggestion); setEmailSuggestion('') }}
                className="text-xs text-orange-500 mt-1 ml-1"
              >
                Você quis dizer {emailSuggestion}?
              </button>
            )}
          </div>

          {/* Confirm Email Input */}
          <div>
            <div className={`flex items-center gap-3 bg-white rounded-xl px-4 py-3.5 border ${
              !confirmEmail
                ? 'border-surface-200'
                : email.trim().toLowerCase() === confirmEmail.trim().toLowerCase()
                ? 'border-green-500'
                : 'border-red-500'
            }`}>
              <Mail className={`w-5 h-5 flex-shrink-0 ${
                !confirmEmail
                  ? 'text-orange-500'
                  : email.trim().toLowerCase() === confirmEmail.trim().toLowerCase()
                  ? 'text-green-500'
                  : 'text-red-500'
              }`} />
              <input
                type="email"
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                className="flex-1 bg-transparent text-surface-800 placeholder-surface-400 focus:outline-none text-base"
                placeholder="Confirmar email"
                autoComplete="email"
                required
              />
            </div>
            {confirmEmail && (
              <p className={`text-xs mt-1 ml-1 ${
                email.trim().toLowerCase() === confirmEmail.trim().toLowerCase()
                  ? 'text-green-500'
                  : 'text-red-500'
              }`}>
                {email.trim().toLowerCase() === confirmEmail.trim().toLowerCase()
                  ? 'Emails coincidem'
                  : 'Os emails não coincidem'}
              </p>
            )}
          </div>

          {/* Phone Input */}
          <div className="flex items-center gap-3 bg-white rounded-xl px-4 py-3.5 border border-surface-200">
            <Phone className="w-5 h-5 text-orange-500 flex-shrink-0" />
            <input
              type="tel"
              value={phone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              className="flex-1 bg-transparent text-surface-800 placeholder-surface-400 focus:outline-none text-base"
              placeholder="(00) 00000-0000"
              autoComplete="tel"
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
              placeholder="Senha (mín. 8 caracteres)"
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

          {/* Password strength indicator */}
          {password && (
            <div className="flex gap-1 px-1">
              {[1, 2, 3, 4].map((level) => (
                <div
                  key={level}
                  className={`h-1 flex-1 rounded-full ${
                    validatePassword(password).strength >= level
                      ? level <= 2 ? 'bg-red-400' : level === 3 ? 'bg-yellow-400' : 'bg-green-400'
                      : 'bg-surface-200'
                  }`}
                />
              ))}
            </div>
          )}

          {/* Password requirements */}
          {password && (
            <div className="px-1 space-y-1">
              <p className="text-xs text-surface-500 mb-1">Requisitos da senha (mínimo 3 de 4):</p>
              <div className="grid grid-cols-2 gap-1">
                <div className={`flex items-center gap-1.5 text-xs ${password.length >= 8 ? 'text-green-500' : 'text-surface-400'}`}>
                  <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[10px] ${password.length >= 8 ? 'bg-green-500 text-white' : 'bg-surface-200 text-surface-400'}`}>
                    {password.length >= 8 ? '✓' : ''}
                  </span>
                  Mínimo 8 caracteres
                </div>
                <div className={`flex items-center gap-1.5 text-xs ${/[A-Z]/.test(password) ? 'text-green-500' : 'text-surface-400'}`}>
                  <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[10px] ${/[A-Z]/.test(password) ? 'bg-green-500 text-white' : 'bg-surface-200 text-surface-400'}`}>
                    {/[A-Z]/.test(password) ? '✓' : ''}
                  </span>
                  Letra maiúscula
                </div>
                <div className={`flex items-center gap-1.5 text-xs ${/[a-z]/.test(password) ? 'text-green-500' : 'text-surface-400'}`}>
                  <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[10px] ${/[a-z]/.test(password) ? 'bg-green-500 text-white' : 'bg-surface-200 text-surface-400'}`}>
                    {/[a-z]/.test(password) ? '✓' : ''}
                  </span>
                  Letra minúscula
                </div>
                <div className={`flex items-center gap-1.5 text-xs ${/[0-9]/.test(password) ? 'text-green-500' : 'text-surface-400'}`}>
                  <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[10px] ${/[0-9]/.test(password) ? 'bg-green-500 text-white' : 'bg-surface-200 text-surface-400'}`}>
                    {/[0-9]/.test(password) ? '✓' : ''}
                  </span>
                  Número (0-9)
                </div>
                <div className={`flex items-center gap-1.5 text-xs col-span-2 ${/[!@#$%^&*(),.?":{}|<>]/.test(password) ? 'text-green-500' : 'text-surface-400'}`}>
                  <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[10px] ${/[!@#$%^&*(),.?":{}|<>]/.test(password) ? 'bg-green-500 text-white' : 'bg-surface-200 text-surface-400'}`}>
                    {/[!@#$%^&*(),.?":{}|<>]/.test(password) ? '✓' : ''}
                  </span>
                  Caractere especial (!@#$...)
                </div>
              </div>
            </div>
          )}

          {/* Confirm Password Input */}
          <div className="flex items-center gap-3 bg-white rounded-xl px-4 py-3.5 border border-surface-200">
            <Lock className="w-5 h-5 text-orange-500 flex-shrink-0" />
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="flex-1 bg-transparent text-surface-800 placeholder-surface-400 focus:outline-none text-base"
              placeholder="Confirmar senha"
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

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 text-white font-semibold py-4 px-6 rounded-full disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-orange-500/30 active:scale-[0.98] transition-transform mt-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Enviando...
              </>
            ) : (
              'Continuar'
            )}
          </button>

          {/* Login Link */}
          <p className="text-center text-surface-500 text-sm pt-2">
            Já tem uma conta?{' '}
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="text-orange-500 font-medium"
            >
              Faça login
            </button>
          </p>
        </form>
      </div>
    </div>
  )
}
