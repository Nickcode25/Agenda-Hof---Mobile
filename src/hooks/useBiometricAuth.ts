import { useState, useEffect, useCallback } from 'react'
import { Capacitor } from '@capacitor/core'
import {
  BiometricAuth,
  BiometryType,
  CheckBiometryResult,
  AndroidBiometryStrength,
} from '@aparajita/capacitor-biometric-auth'
import { SecureStorage } from '@aparajita/capacitor-secure-storage'

// Keys for secure storage
const BIOMETRIC_ENABLED_KEY = 'biometric_enabled'
const BIOMETRIC_EMAIL_KEY = 'biometric_email'
const BIOMETRIC_PASSWORD_KEY = 'biometric_password'
const LAST_ACTIVITY_KEY = 'last_activity_timestamp'

// Session timeout in milliseconds (15 minutes)
const SESSION_TIMEOUT_MS = 15 * 60 * 1000

// Safe wrapper for SecureStorage operations
const safeStorageGet = async (key: string): Promise<string | null> => {
  try {
    if (!Capacitor.isNativePlatform()) return null
    const result = await SecureStorage.get(key)
    return result ? String(result) : null
  } catch (error) {
    console.log(`SecureStorage.get(${key}) failed:`, error)
    return null
  }
}

const safeStorageSet = async (key: string, value: string): Promise<boolean> => {
  try {
    if (!Capacitor.isNativePlatform()) return false
    await SecureStorage.set(key, value)
    return true
  } catch (error) {
    console.log(`SecureStorage.set(${key}) failed:`, error)
    return false
  }
}

const safeStorageRemove = async (key: string): Promise<boolean> => {
  try {
    if (!Capacitor.isNativePlatform()) return false
    await SecureStorage.remove(key)
    return true
  } catch (error) {
    console.log(`SecureStorage.remove(${key}) failed:`, error)
    return false
  }
}

export type BiometryTypeInfo = {
  type: BiometryType
  name: string
  icon: 'faceid' | 'touchid' | 'biometric'
}

export function useBiometricAuth() {
  const [biometryAvailable, setBiometryAvailable] = useState(false)
  const [biometryType, setBiometryType] = useState<BiometryTypeInfo | null>(null)
  const [biometricEnabled, setBiometricEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [failedAttempts, setFailedAttempts] = useState(0)

  // Get biometry type name and icon
  const getBiometryInfo = (type: BiometryType): BiometryTypeInfo => {
    switch (type) {
      case BiometryType.faceId:
        return { type, name: 'Face ID', icon: 'faceid' }
      case BiometryType.touchId:
        return { type, name: 'Touch ID', icon: 'touchid' }
      case BiometryType.fingerprintAuthentication:
        return { type, name: 'Impressão Digital', icon: 'touchid' }
      case BiometryType.faceAuthentication:
        return { type, name: 'Reconhecimento Facial', icon: 'faceid' }
      case BiometryType.irisAuthentication:
        return { type, name: 'Reconhecimento de Íris', icon: 'biometric' }
      default:
        return { type, name: 'Biometria', icon: 'biometric' }
    }
  }

  // Check if biometry is available on the device
  const checkBiometryAvailability = useCallback(async (): Promise<CheckBiometryResult | null> => {
    if (!Capacitor.isNativePlatform()) {
      console.log('[Biometric] Not on native platform')
      return null
    }

    try {
      const result = await BiometricAuth.checkBiometry()
      console.log('[Biometric] Check result:', result)

      const isAvailable = result.isAvailable && result.biometryType !== BiometryType.none
      setBiometryAvailable(isAvailable)

      if (isAvailable) {
        setBiometryType(getBiometryInfo(result.biometryType))
      }

      return result
    } catch (error) {
      console.error('[Biometric] Error checking biometry:', error)
      setBiometryAvailable(false)
      return null
    }
  }, [])

  // Check if biometric is enabled for current user
  const checkBiometricEnabled = useCallback(async (): Promise<boolean> => {
    if (!Capacitor.isNativePlatform()) {
      return false
    }

    const enabled = await safeStorageGet(BIOMETRIC_ENABLED_KEY)
    const isEnabled = enabled === 'true'
    setBiometricEnabled(isEnabled)
    return isEnabled
  }, [])

  // Check if session has timed out
  const checkSessionTimeout = useCallback(async (): Promise<boolean> => {
    if (!Capacitor.isNativePlatform()) {
      return false
    }

    const lastActivity = await safeStorageGet(LAST_ACTIVITY_KEY)
    if (!lastActivity) return true // No activity recorded, needs auth

    const lastTimestamp = parseInt(String(lastActivity), 10)
    const now = Date.now()
    const elapsed = now - lastTimestamp

    return elapsed > SESSION_TIMEOUT_MS
  }, [])

  // Update last activity timestamp
  const updateLastActivity = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) return
    await safeStorageSet(LAST_ACTIVITY_KEY, Date.now().toString())
  }, [])

  // Enable biometric authentication
  const enableBiometric = useCallback(async (email: string, password: string): Promise<boolean> => {
    if (!Capacitor.isNativePlatform()) {
      console.log('[Biometric] Not on native platform')
      return false
    }

    try {
      // First verify biometry is available
      const biometryCheck = await BiometricAuth.checkBiometry()
      if (!biometryCheck.isAvailable) {
        console.log('[Biometric] Biometry not available')
        return false
      }

      // Authenticate to confirm the user
      await BiometricAuth.authenticate({
        reason: 'Confirme sua identidade para ativar a biometria',
        cancelTitle: 'Cancelar',
        allowDeviceCredential: false,
        androidTitle: 'Ativar Biometria',
        androidSubtitle: 'Use sua biometria para confirmar',
        androidConfirmationRequired: false,
        androidBiometryStrength: AndroidBiometryStrength.weak,
      })

      // Store credentials securely
      await safeStorageSet(BIOMETRIC_EMAIL_KEY, email)
      await safeStorageSet(BIOMETRIC_PASSWORD_KEY, password)
      await safeStorageSet(BIOMETRIC_ENABLED_KEY, 'true')
      await updateLastActivity()

      setBiometricEnabled(true)
      console.log('[Biometric] Biometric enabled successfully')
      return true
    } catch (error) {
      console.error('[Biometric] Error enabling biometric:', error)
      return false
    }
  }, [updateLastActivity])

  // Disable biometric authentication
  const disableBiometric = useCallback(async (): Promise<boolean> => {
    if (!Capacitor.isNativePlatform()) {
      return false
    }

    await safeStorageRemove(BIOMETRIC_EMAIL_KEY)
    await safeStorageRemove(BIOMETRIC_PASSWORD_KEY)
    await safeStorageRemove(BIOMETRIC_ENABLED_KEY)
    await safeStorageRemove(LAST_ACTIVITY_KEY)

    setBiometricEnabled(false)
    console.log('[Biometric] Biometric disabled successfully')
    return true
  }, [])

  // Authenticate with biometric and return credentials
  const authenticateWithBiometric = useCallback(async (): Promise<{ email: string; password: string } | null> => {
    if (!Capacitor.isNativePlatform()) {
      console.log('[Biometric] Not on native platform')
      return null
    }

    try {
      // First check if biometric is enabled
      const isEnabled = await safeStorageGet(BIOMETRIC_ENABLED_KEY)
      if (isEnabled !== 'true') {
        console.log('[Biometric] Biometric not enabled')
        return null
      }

      // Authenticate with biometry
      await BiometricAuth.authenticate({
        reason: 'Desbloqueie para acessar o app',
        cancelTitle: 'Usar Senha',
        allowDeviceCredential: false,
        androidTitle: 'Agenda HOF',
        androidSubtitle: 'Use sua biometria para entrar',
        androidConfirmationRequired: false,
        androidBiometryStrength: AndroidBiometryStrength.weak,
      })

      // Get stored credentials
      const emailData = await safeStorageGet(BIOMETRIC_EMAIL_KEY)
      const passwordData = await safeStorageGet(BIOMETRIC_PASSWORD_KEY)

      const email = emailData ? String(emailData) : null
      const password = passwordData ? String(passwordData) : null

      if (!email || !password) {
        console.log('[Biometric] No credentials stored')
        await disableBiometric() // Clear inconsistent state
        return null
      }

      // Update activity timestamp
      await updateLastActivity()
      setFailedAttempts(0)

      return { email, password }
    } catch (error: unknown) {
      console.error('[Biometric] Authentication failed:', error)
      setFailedAttempts((prev) => prev + 1)
      return null
    }
  }, [disableBiometric, updateLastActivity])

  // Get stored email (to show who is logging in)
  const getStoredEmail = useCallback(async (): Promise<string | null> => {
    if (!Capacitor.isNativePlatform()) return null
    const emailData = await safeStorageGet(BIOMETRIC_EMAIL_KEY)
    return emailData ? String(emailData) : null
  }, [])

  // Initialize on mount
  useEffect(() => {
    const init = async () => {
      setLoading(true)
      await checkBiometryAvailability()
      await checkBiometricEnabled()
      setLoading(false)
    }

    init()
  }, [checkBiometryAvailability, checkBiometricEnabled])

  return {
    // State
    biometryAvailable,
    biometryType,
    biometricEnabled,
    loading,
    failedAttempts,
    maxFailedAttempts: 3,

    // Actions
    checkBiometryAvailability,
    checkBiometricEnabled,
    checkSessionTimeout,
    updateLastActivity,
    enableBiometric,
    disableBiometric,
    authenticateWithBiometric,
    getStoredEmail,
  }
}
