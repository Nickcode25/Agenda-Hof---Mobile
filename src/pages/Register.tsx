import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, User, Mail, Lock, Eye, EyeOff, Loader2, CheckCircle, Phone, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useStatusBar } from '@/hooks/useStatusBar'

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
  '11', '12', '13', '14', '15', '16', '17', '18', '19',
  '21', '22', '24',
  '27', '28',
  '31', '32', '33', '34', '35', '37', '38',
  '41', '42', '43', '44', '45', '46',
  '47', '48', '49',
  '51', '53', '54', '55',
  '61',
  '62', '64',
  '63',
  '65', '66',
  '67',
  '68',
  '69',
  '71', '73', '74', '75', '77',
  '79',
  '81', '87',
  '82',
  '83',
  '84',
  '85', '88',
  '86', '89',
  '91', '93', '94',
  '92', '97',
  '95',
  '96',
  '98', '99',
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

  const phoneNumber = numbers.slice(2)
  if (/^(\d)\1+$/.test(phoneNumber)) {
    return { valid: false, error: 'Telefone inválido' }
  }

  return { valid: true }
}

// Corrigir typos de email
const fixEmailTypo = (email: string): string => {
  const [local, domain] = email.split('@')
  if (domain && commonTypos[domain]) {
    return `${local}@${commonTypos[domain]}`
  }
  return email
}

// Componente de Input reutilizável
interface InputFieldProps {
  icon: React.ReactNode
  type: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  autoComplete?: string
  showToggle?: boolean
  isVisible?: boolean
  onToggleVisibility?: () => void
  isValid?: boolean | null
  inputRef?: React.RefObject<HTMLInputElement>
  onKeyDown?: (e: React.KeyboardEvent) => void
}

function InputField({
  icon,
  type,
  value,
  onChange,
  placeholder,
  autoComplete,
  showToggle,
  isVisible,
  onToggleVisibility,
  isValid,
  inputRef,
  onKeyDown,
}: InputFieldProps) {
  const borderColor = isValid === null || isValid === undefined
    ? 'border-surface-200'
    : isValid
    ? 'border-green-500'
    : 'border-red-500'

  const iconColor = isValid === null || isValid === undefined
    ? 'text-primary-500'
    : isValid
    ? 'text-green-500'
    : 'text-red-500'

  return (
    <div className={`flex items-center gap-3 bg-white rounded-xl px-4 py-3.5 border ${borderColor} transition-colors`}>
      <span className={`flex-shrink-0 ${iconColor}`}>{icon}</span>
      <input
        ref={inputRef}
        type={showToggle && isVisible ? 'text' : type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        className="flex-1 bg-transparent text-surface-800 placeholder-surface-400 focus:outline-none text-base"
        placeholder={placeholder}
        autoComplete={autoComplete}
      />
      {showToggle && onToggleVisibility && (
        <button
          type="button"
          onClick={onToggleVisibility}
          className="text-surface-400 flex-shrink-0"
        >
          {isVisible ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </button>
      )}
    </div>
  )
}

// Etapa 1 - Dados de Acesso
interface Step1Props {
  name: string
  setName: (value: string) => void
  email: string
  setEmail: (value: string) => void
  password: string
  setPassword: (value: string) => void
  showPassword: boolean
  setShowPassword: (value: boolean) => void
  emailSuggestion: string
  setEmailSuggestion: (value: string) => void
  onContinue: () => void
  isValid: boolean
}

function Step1({
  name,
  setName,
  email,
  setEmail,
  password,
  setPassword,
  showPassword,
  setShowPassword,
  emailSuggestion,
  setEmailSuggestion,
  onContinue,
  isValid,
}: Step1Props) {
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)

  const handleEmailChange = (value: string) => {
    setEmail(value)
    const fixed = fixEmailTypo(value.toLowerCase())
    if (fixed !== value.toLowerCase() && value.includes('@')) {
      setEmailSuggestion(fixed)
    } else {
      setEmailSuggestion('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent, nextRef?: React.RefObject<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (nextRef?.current) {
        nextRef.current.focus()
      } else if (isValid) {
        onContinue()
      }
    }
  }

  const isNameValid = name.trim().length >= 2
  const isEmailValid = emailRegex.test(email.trim().toLowerCase())
  const isPasswordValid = password.length >= 8

  return (
    <div className="space-y-3">
      {/* Name Input */}
      <InputField
        icon={<User className="w-5 h-5" />}
        type="text"
        value={name}
        onChange={setName}
        placeholder="Seu nome completo"
        autoComplete="name"
        isValid={name ? isNameValid : null}
        onKeyDown={(e) => handleKeyDown(e, emailRef)}
      />
      {name && !isNameValid && (
        <p className="text-xs text-red-500 ml-1">Nome deve ter pelo menos 2 caracteres</p>
      )}

      {/* Email Input */}
      <div>
        <InputField
          icon={<Mail className="w-5 h-5" />}
          type="email"
          value={email}
          onChange={handleEmailChange}
          placeholder="seu@email.com"
          autoComplete="email"
          isValid={email ? isEmailValid : null}
          inputRef={emailRef}
          onKeyDown={(e) => handleKeyDown(e, passwordRef)}
        />
        {emailSuggestion && (
          <button
            type="button"
            onClick={() => { setEmail(emailSuggestion); setEmailSuggestion('') }}
            className="text-xs text-primary-500 mt-1 ml-1"
          >
            Você quis dizer {emailSuggestion}?
          </button>
        )}
        {email && !isEmailValid && !emailSuggestion && (
          <p className="text-xs text-red-500 ml-1 mt-1">Email inválido</p>
        )}
      </div>

      {/* Password Input */}
      <InputField
        icon={<Lock className="w-5 h-5" />}
        type="password"
        value={password}
        onChange={setPassword}
        placeholder="Senha (mín. 8 caracteres)"
        autoComplete="new-password"
        showToggle
        isVisible={showPassword}
        onToggleVisibility={() => setShowPassword(!showPassword)}
        isValid={password ? isPasswordValid : null}
        inputRef={passwordRef}
        onKeyDown={(e) => handleKeyDown(e)}
      />
      {password && !isPasswordValid && (
        <p className="text-xs text-red-500 ml-1">Senha deve ter no mínimo 8 caracteres</p>
      )}

      {/* Continue Button */}
      <button
        type="button"
        onClick={onContinue}
        disabled={!isValid}
        className="w-full bg-primary-500 text-white font-semibold py-4 px-6 rounded-full disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-primary-500/30 active:scale-[0.98] transition-all mt-4"
      >
        Continuar
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  )
}

// Etapa 2 - Confirmações
interface Step2Props {
  email: string
  password: string
  confirmEmail: string
  setConfirmEmail: (value: string) => void
  confirmPassword: string
  setConfirmPassword: (value: string) => void
  phone: string
  setPhone: (value: string) => void
  showConfirmPassword: boolean
  setShowConfirmPassword: (value: boolean) => void
  onBack: () => void
  onSubmit: () => void
  isValid: boolean
  loading: boolean
  error: string
}

function Step2({
  email,
  password,
  confirmEmail,
  setConfirmEmail,
  confirmPassword,
  setConfirmPassword,
  phone,
  setPhone,
  showConfirmPassword,
  setShowConfirmPassword,
  onBack,
  onSubmit,
  isValid,
  loading,
  error,
}: Step2Props) {
  const confirmPasswordRef = useRef<HTMLInputElement>(null)
  const phoneRef = useRef<HTMLInputElement>(null)

  const handlePhoneChange = (value: string) => {
    const formatted = formatPhone(value)
    setPhone(formatted)
  }

  const handleKeyDown = (e: React.KeyboardEvent, nextRef?: React.RefObject<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (nextRef?.current) {
        nextRef.current.focus()
      } else if (isValid) {
        onSubmit()
      }
    }
  }

  const isConfirmEmailValid = email.trim().toLowerCase() === confirmEmail.trim().toLowerCase()
  const isConfirmPasswordValid = password === confirmPassword
  const phoneValidation = validatePhone(phone)
  const isPhoneValid = phoneValidation.valid

  return (
    <div className="space-y-3">
      {/* Confirm Email Input */}
      <div>
        <InputField
          icon={<Mail className="w-5 h-5" />}
          type="email"
          value={confirmEmail}
          onChange={setConfirmEmail}
          placeholder="Confirmar email"
          autoComplete="email"
          isValid={confirmEmail ? isConfirmEmailValid : null}
          onKeyDown={(e) => handleKeyDown(e, confirmPasswordRef)}
        />
        {confirmEmail && (
          <p className={`text-xs mt-1 ml-1 ${isConfirmEmailValid ? 'text-green-500' : 'text-red-500'}`}>
            {isConfirmEmailValid ? 'Emails coincidem' : 'Os emails não coincidem'}
          </p>
        )}
      </div>

      {/* Confirm Password Input */}
      <div>
        <InputField
          icon={<Lock className="w-5 h-5" />}
          type="password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          placeholder="Confirmar senha"
          autoComplete="new-password"
          showToggle
          isVisible={showConfirmPassword}
          onToggleVisibility={() => setShowConfirmPassword(!showConfirmPassword)}
          isValid={confirmPassword ? isConfirmPasswordValid : null}
          inputRef={confirmPasswordRef}
          onKeyDown={(e) => handleKeyDown(e, phoneRef)}
        />
        {confirmPassword && (
          <p className={`text-xs mt-1 ml-1 ${isConfirmPasswordValid ? 'text-green-500' : 'text-red-500'}`}>
            {isConfirmPasswordValid ? 'Senhas coincidem' : 'As senhas não coincidem'}
          </p>
        )}
      </div>

      {/* Phone Input */}
      <div>
        <InputField
          icon={<Phone className="w-5 h-5" />}
          type="tel"
          value={phone}
          onChange={handlePhoneChange}
          placeholder="(00) 00000-0000"
          autoComplete="tel"
          isValid={phone.replace(/\D/g, '').length >= 10 ? isPhoneValid : null}
          inputRef={phoneRef}
          onKeyDown={(e) => handleKeyDown(e)}
        />
        {phone.replace(/\D/g, '').length >= 10 && !isPhoneValid && (
          <p className="text-xs text-red-500 ml-1 mt-1">{phoneValidation.error}</p>
        )}
      </div>

      {error && (
        <p className="text-red-500 text-sm text-center py-2">{error}</p>
      )}

      {/* Buttons */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          disabled={loading}
          className="flex-1 bg-surface-200 text-surface-700 font-semibold py-4 px-6 rounded-full active:scale-[0.98] transition-transform"
        >
          Voltar
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={!isValid || loading}
          className="flex-1 bg-primary-500 text-white font-semibold py-4 px-6 rounded-full disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-primary-500/30 active:scale-[0.98] transition-all"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Criando...
            </>
          ) : (
            'Criar conta'
          )}
        </button>
      </div>
    </div>
  )
}

// Indicador de Etapas
function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      <div className={`w-8 h-1 rounded-full transition-colors ${currentStep >= 1 ? 'bg-primary-500' : 'bg-surface-300'}`} />
      <div className={`w-8 h-1 rounded-full transition-colors ${currentStep >= 2 ? 'bg-primary-500' : 'bg-surface-300'}`} />
    </div>
  )
}

export function RegisterPage() {
  const navigate = useNavigate()
  useStatusBar('light')

  // Step state
  const [currentStep, setCurrentStep] = useState(1)

  // Form state - Step 1
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [emailSuggestion, setEmailSuggestion] = useState('')

  // Form state - Step 2
  const [confirmEmail, setConfirmEmail] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // UI state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Refs for animation
  const containerRef = useRef<HTMLDivElement>(null)

  // Validações
  const isStep1Valid =
    name.trim().length >= 2 &&
    emailRegex.test((emailSuggestion || email).trim().toLowerCase()) &&
    password.length >= 8

  const emailToUse = emailSuggestion || email.trim().toLowerCase()
  const isStep2Valid =
    emailToUse === confirmEmail.trim().toLowerCase() &&
    password === confirmPassword &&
    validatePhone(phone).valid

  // Handlers
  const handleContinueToStep2 = () => {
    if (isStep1Valid) {
      setCurrentStep(2)
      setError('')
    }
  }

  const handleBackToStep1 = () => {
    setCurrentStep(1)
    setError('')
  }

  const handleSubmit = async () => {
    if (!isStep2Valid) return

    setLoading(true)
    setError('')

    try {
      const trialEndDate = new Date()
      trialEndDate.setDate(trialEndDate.getDate() + 7)

      const { error: signUpError } = await supabase.auth.signUp({
        email: emailToUse,
        password: password,
        options: {
          data: {
            full_name: name.trim(),
            phone: phone.replace(/\D/g, ''),
            trial_end_date: trialEndDate.toISOString()
          }
        }
      })

      if (signUpError) {
        if (signUpError.message.includes('already registered')) {
          throw new Error('Este email já está cadastrado')
        }
        throw signUpError
      }

      setSuccess(true)
    } catch (err: any) {
      setError(err.message || 'Erro ao criar conta. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  // Auto-focus on step change
  useEffect(() => {
    if (containerRef.current) {
      const firstInput = containerRef.current.querySelector('input')
      if (firstInput) {
        setTimeout(() => firstInput.focus(), 300)
      }
    }
  }, [currentStep])

  // Tela de sucesso
  if (success) {
    return (
      <div className="min-h-screen flex flex-col bg-surface-100 pb-safe-bottom">
        <div className="h-safe-top bg-surface-100" />
        <div className="flex-1 flex flex-col justify-center px-6">
          <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6 animate-bounce-once">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold text-surface-800 mb-3">Conta criada!</h1>
            <p className="text-surface-500 mb-8">
              Sua conta foi criada com sucesso. Você tem 7 dias de período de teste gratuito.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="w-full bg-primary-500 text-white font-semibold py-4 px-6 rounded-full shadow-lg shadow-primary-500/30 active:scale-[0.98] transition-transform"
            >
              Fazer login
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Formulário principal
  return (
    <div className="min-h-screen flex flex-col bg-surface-100 pb-safe-bottom relative overflow-hidden">
      <div className="h-safe-top bg-surface-100" />

      {/* Wave decoration at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-48 pointer-events-none">
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
          onClick={() => currentStep === 1 ? navigate('/login') : handleBackToStep1()}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-sm active:scale-95 transition-transform"
        >
          <ArrowLeft className="w-5 h-5 text-surface-600" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col px-6 relative z-10 pb-52 overflow-hidden">
        <div className="flex flex-col items-center mb-4">
          <h1 className="text-2xl font-bold text-surface-800 text-center">Criar conta</h1>
          <p className="text-surface-400 mt-2 text-sm text-center">
            {currentStep === 1 ? 'Preencha seus dados de acesso' : 'Confirme suas informações'}
          </p>
        </div>

        {/* Step Indicator */}
        <StepIndicator currentStep={currentStep} />

        {/* Form Container with Animation */}
        <div className="relative overflow-hidden flex-1">
          <div
            ref={containerRef}
            className={`transition-transform duration-300 ease-out ${
              currentStep === 1 ? 'translate-x-0' : '-translate-x-full'
            }`}
            style={{ position: 'absolute', width: '100%' }}
          >
            <Step1
              name={name}
              setName={setName}
              email={email}
              setEmail={setEmail}
              password={password}
              setPassword={setPassword}
              showPassword={showPassword}
              setShowPassword={setShowPassword}
              emailSuggestion={emailSuggestion}
              setEmailSuggestion={setEmailSuggestion}
              onContinue={handleContinueToStep2}
              isValid={isStep1Valid}
            />
          </div>

          <div
            className={`transition-transform duration-300 ease-out ${
              currentStep === 2 ? 'translate-x-0' : 'translate-x-full'
            }`}
            style={{ position: 'absolute', width: '100%' }}
          >
            <Step2
              email={emailToUse}
              password={password}
              confirmEmail={confirmEmail}
              setConfirmEmail={setConfirmEmail}
              confirmPassword={confirmPassword}
              setConfirmPassword={setConfirmPassword}
              phone={phone}
              setPhone={setPhone}
              showConfirmPassword={showConfirmPassword}
              setShowConfirmPassword={setShowConfirmPassword}
              onBack={handleBackToStep1}
              onSubmit={handleSubmit}
              isValid={isStep2Valid}
              loading={loading}
              error={error}
            />
          </div>
        </div>

        {/* Login Link - Always visible */}
        <div className="pt-4 pb-2">
          <p className="text-center text-surface-500 text-sm">
            Já tem uma conta?{' '}
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="text-primary-500 font-medium"
            >
              Faça login
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
