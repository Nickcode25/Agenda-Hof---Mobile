import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useStatusBar } from '@/hooks/useStatusBar'
import { useBiometricAuth, BiometryTypeInfo } from '@/hooks/useBiometricAuth'

// Face ID icon
const FaceIdIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
    <path d="M7 3H5a2 2 0 00-2 2v2M17 3h2a2 2 0 012 2v2M7 21H5a2 2 0 01-2-2v-2M17 21h2a2 2 0 002-2v-2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9 9v1.5M15 9v1.5" strokeLinecap="round" />
    <path d="M12 12v2" strokeLinecap="round" />
    <path d="M8.5 16c.5 1 1.5 1.5 3.5 1.5s3-.5 3.5-1.5" strokeLinecap="round" />
  </svg>
)

// Touch ID icon (fingerprint)
const TouchIdIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
    <path d="M12 2a10 10 0 0110 10c0 1.5-.5 3-1 4.5" strokeLinecap="round" />
    <path d="M2 12a10 10 0 0118-6" strokeLinecap="round" />
    <path d="M12 6a6 6 0 016 6c0 1-.2 2-.5 3" strokeLinecap="round" />
    <path d="M6 12a6 6 0 018.5-5.5" strokeLinecap="round" />
    <path d="M12 10a2 2 0 012 2v4" strokeLinecap="round" />
    <path d="M12 22v-8" strokeLinecap="round" />
  </svg>
)

// Generic biometric icon
const BiometricIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="12" cy="10" r="3" />
    <path d="M7 21v-2a2 2 0 012-2h6a2 2 0 012 2v2" />
  </svg>
)

interface BiometricLoginPageProps {
  onAuthenticate: (email: string, password: string) => Promise<boolean>
  onUsePassword: () => void
}

export function BiometricLoginPage({ onAuthenticate, onUsePassword }: BiometricLoginPageProps) {
  useStatusBar('light')

  const {
    biometryType,
    failedAttempts,
    maxFailedAttempts,
    authenticateWithBiometric,
    getStoredEmail,
  } = useBiometricAuth()

  const [email, setEmail] = useState<string | null>(null)
  const [authenticating, setAuthenticating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  // Load stored email on mount
  useEffect(() => {
    const loadEmail = async () => {
      const storedEmail = await getStoredEmail()
      setEmail(storedEmail)
    }
    loadEmail()
  }, [getStoredEmail])

  // Auto-trigger biometric on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      handleBiometricAuth()
    }, 500)

    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Show password login after max failed attempts
  useEffect(() => {
    if (failedAttempts >= maxFailedAttempts) {
      setShowPassword(true)
      setError('Muitas tentativas. Use sua senha para entrar.')
    }
  }, [failedAttempts, maxFailedAttempts])

  const handleBiometricAuth = useCallback(async () => {
    if (authenticating || showPassword) return

    setAuthenticating(true)
    setError(null)

    try {
      const credentials = await authenticateWithBiometric()

      if (credentials) {
        const success = await onAuthenticate(credentials.email, credentials.password)
        if (!success) {
          setError('Falha ao autenticar. Tente novamente.')
        }
      } else {
        // User cancelled or auth failed
        if (failedAttempts < maxFailedAttempts - 1) {
          setError('Tente novamente ou use sua senha.')
        }
      }
    } catch (err) {
      console.error('[BiometricLogin] Error:', err)
      setError('Erro na autenticação. Tente novamente.')
    } finally {
      setAuthenticating(false)
    }
  }, [
    authenticating,
    showPassword,
    authenticateWithBiometric,
    onAuthenticate,
    failedAttempts,
    maxFailedAttempts,
  ])

  const getBiometricIcon = (type: BiometryTypeInfo | null) => {
    if (!type) return <BiometricIcon className="w-16 h-16 text-primary-500" />

    switch (type.icon) {
      case 'faceid':
        return <FaceIdIcon className="w-16 h-16 text-primary-500" />
      case 'touchid':
        return <TouchIdIcon className="w-16 h-16 text-primary-500" />
      default:
        return <BiometricIcon className="w-16 h-16 text-primary-500" />
    }
  }

  const getBiometricText = (type: BiometryTypeInfo | null) => {
    if (!type) return 'Use a biometria para entrar'

    switch (type.icon) {
      case 'faceid':
        return 'Use Face ID para entrar'
      case 'touchid':
        return 'Toque para desbloquear'
      default:
        return 'Use a biometria para entrar'
    }
  }

  return (
    <div className="min-h-screen bg-surface-50 flex flex-col">
      {/* Safe area top */}
      <div className="h-safe-top bg-surface-50" />

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="w-20 h-20 bg-primary-500 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-500/30">
            <span className="text-white text-3xl font-bold">A</span>
          </div>
        </motion.div>

        {/* App name */}
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-2xl font-bold text-surface-900 mb-2"
        >
          Agenda HOF
        </motion.h1>

        {/* Email */}
        {email && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-surface-500 text-[15px] mb-12"
          >
            {email}
          </motion.p>
        )}

        {/* Biometric Button */}
        {!showPassword && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, type: 'spring' }}
            onClick={handleBiometricAuth}
            disabled={authenticating}
            className="mb-6"
          >
            <motion.div
              animate={authenticating ? { scale: [1, 1.05, 1] } : {}}
              transition={authenticating ? { repeat: Infinity, duration: 1.5 } : {}}
              className="w-24 h-24 bg-primary-50 rounded-full flex items-center justify-center active:bg-primary-100 transition-colors"
            >
              {getBiometricIcon(biometryType)}
            </motion.div>
          </motion.button>
        )}

        {/* Biometric text */}
        {!showPassword && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-surface-600 text-[15px] mb-2"
          >
            {authenticating ? 'Autenticando...' : getBiometricText(biometryType)}
          </motion.p>
        )}

        {/* Error message */}
        {error && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-red-500 text-[14px] text-center mb-4 max-w-[280px]"
          >
            {error}
          </motion.p>
        )}

        {/* Failed attempts indicator */}
        {failedAttempts > 0 && failedAttempts < maxFailedAttempts && !showPassword && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-1 mb-4"
          >
            {Array.from({ length: maxFailedAttempts }).map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full ${
                  i < failedAttempts ? 'bg-red-400' : 'bg-surface-200'
                }`}
              />
            ))}
          </motion.div>
        )}
      </div>

      {/* Bottom actions */}
      <div className="px-8 pb-8">
        <button
          onClick={onUsePassword}
          className="w-full py-4 text-primary-500 font-semibold text-[17px] active:opacity-70 transition-opacity"
        >
          Entrar com senha
        </button>
      </div>

      {/* Safe area bottom */}
      <div className="h-safe-bottom bg-surface-50" />
    </div>
  )
}
