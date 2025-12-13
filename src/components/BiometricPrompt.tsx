import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { BiometryTypeInfo } from '@/hooks/useBiometricAuth'

// Face ID icon
const FaceIdIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
    {/* Face outline */}
    <path d="M7 3H5a2 2 0 00-2 2v2M17 3h2a2 2 0 012 2v2M7 21H5a2 2 0 01-2-2v-2M17 21h2a2 2 0 002-2v-2" strokeLinecap="round" strokeLinejoin="round" />
    {/* Eyes */}
    <path d="M9 9v1.5M15 9v1.5" strokeLinecap="round" />
    {/* Nose */}
    <path d="M12 12v2" strokeLinecap="round" />
    {/* Mouth */}
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

interface BiometricPromptProps {
  isOpen: boolean
  biometryType: BiometryTypeInfo | null
  onEnable: () => Promise<void>
  onSkip: () => void
  isLoading?: boolean
}

export function BiometricPrompt({
  isOpen,
  biometryType,
  onEnable,
  onSkip,
  isLoading = false,
}: BiometricPromptProps) {
  const [enabling, setEnabling] = useState(false)

  const handleEnable = async () => {
    setEnabling(true)
    try {
      await onEnable()
    } finally {
      setEnabling(false)
    }
  }

  const getBiometricIcon = () => {
    if (!biometryType) return <BiometricIcon className="w-16 h-16 text-primary-500" />

    switch (biometryType.icon) {
      case 'faceid':
        return <FaceIdIcon className="w-16 h-16 text-primary-500" />
      case 'touchid':
        return <TouchIdIcon className="w-16 h-16 text-primary-500" />
      default:
        return <BiometricIcon className="w-16 h-16 text-primary-500" />
    }
  }

  const getBiometricName = () => {
    return biometryType?.name || 'Biometria'
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50"
            onClick={onSkip}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-[320px] bg-white rounded-2xl overflow-hidden shadow-xl"
          >
            {/* Content */}
            <div className="p-6 text-center">
              {/* Icon with pulse animation */}
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 15 }}
                className="w-24 h-24 mx-auto mb-4 bg-primary-50 rounded-full flex items-center justify-center"
              >
                {getBiometricIcon()}
              </motion.div>

              {/* Title */}
              <h2 className="text-xl font-bold text-surface-900 mb-2">
                Usar {getBiometricName()}?
              </h2>

              {/* Description */}
              <p className="text-surface-500 text-[15px] leading-relaxed mb-6">
                Acesse o app de forma rápida e segura usando {getBiometricName()} em vez de digitar sua senha.
              </p>

              {/* Buttons */}
              <div className="space-y-3">
                <button
                  onClick={handleEnable}
                  disabled={enabling || isLoading}
                  className="w-full py-3.5 bg-primary-500 text-white font-semibold rounded-xl active:bg-primary-600 disabled:opacity-50 transition-colors"
                >
                  {enabling ? 'Ativando...' : `Ativar ${getBiometricName()}`}
                </button>

                <button
                  onClick={onSkip}
                  disabled={enabling}
                  className="w-full py-3.5 text-surface-500 font-medium active:bg-surface-100 rounded-xl transition-colors"
                >
                  Agora não
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
