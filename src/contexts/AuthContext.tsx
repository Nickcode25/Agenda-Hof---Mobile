import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { Capacitor } from '@capacitor/core'
import { SecureStorage } from '@aparajita/capacitor-secure-storage'
import { supabase } from '@/lib/supabase'

// Secure storage keys
const BIOMETRIC_ENABLED_KEY = 'biometric_enabled'
const BIOMETRIC_EMAIL_KEY = 'biometric_email'
const BIOMETRIC_PASSWORD_KEY = 'biometric_password'
const LAST_ACTIVITY_KEY = 'last_activity_timestamp'
const BIOMETRIC_PROMPT_SHOWN_KEY = 'biometric_prompt_shown'

interface AuthContextType {
  session: Session | null
  user: User | null
  loading: boolean
  biometricEnabled: boolean
  biometricCheckComplete: boolean
  showBiometricPrompt: boolean
  pendingCredentials: { email: string; password: string } | null
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  enableBiometricForCurrentUser: () => Promise<boolean>
  disableBiometric: () => Promise<void>
  dismissBiometricPrompt: () => void
  setBiometricPromptShown: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [biometricEnabled, setBiometricEnabled] = useState(false)
  const [biometricCheckComplete, setBiometricCheckComplete] = useState(false)
  const [showBiometricPrompt, setShowBiometricPrompt] = useState(false)
  const [pendingCredentials, setPendingCredentials] = useState<{ email: string; password: string } | null>(null)

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

  // Check if biometric is enabled
  const checkBiometricStatus = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) {
      setBiometricCheckComplete(true)
      return
    }

    try {
      const enabled = await safeStorageGet(BIOMETRIC_ENABLED_KEY)
      setBiometricEnabled(enabled === 'true')
    } catch (error) {
      console.log('SecureStorage not available:', error)
      setBiometricEnabled(false)
    } finally {
      setBiometricCheckComplete(true)
    }
  }, [])

  // Check if we should show biometric prompt (first login after signup)
  const checkShouldShowBiometricPrompt = useCallback(async (): Promise<boolean> => {
    if (!Capacitor.isNativePlatform()) return false

    const promptShown = await safeStorageGet(BIOMETRIC_PROMPT_SHOWN_KEY)
    const biometricEnabledValue = await safeStorageGet(BIOMETRIC_ENABLED_KEY)

    // Show prompt if not shown before and biometric not enabled
    return promptShown !== 'true' && biometricEnabledValue !== 'true'
  }, [])

  useEffect(() => {
    // Busca sessão inicial com timeout para evitar loading infinito
    const initSession = async () => {
      try {
        // Check biometric status
        await checkBiometricStatus()

        // Timeout de 10 segundos para evitar loading infinito
        const timeoutPromise = new Promise<null>((_, reject) => {
          setTimeout(() => reject(new Error('Timeout ao buscar sessão')), 10000)
        })

        const sessionPromise = supabase.auth.getSession().then(({ data: { session } }) => session)

        const session = await Promise.race([sessionPromise, timeoutPromise])
        setSession(session)
      } catch (error) {
        console.log('Erro ao buscar sessão (pode ser normal na primeira vez):', error)
        setSession(null)
      } finally {
        setLoading(false)
      }
    }

    initSession()

    // Escuta mudanças de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [checkBiometricStatus])

  const signIn = async (email: string, password: string) => {
    console.log('Tentando login com:', email)
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    console.log('Resultado login:', { data, error })
    if (error) {
      console.error('Erro de login:', error.message, error)
      return { error }
    }

    // After successful login, check if we should show biometric prompt
    if (Capacitor.isNativePlatform()) {
      const shouldShowPrompt = await checkShouldShowBiometricPrompt()
      if (shouldShowPrompt) {
        // Store credentials temporarily for enabling biometric
        setPendingCredentials({ email, password })
        setShowBiometricPrompt(true)
      }
    }

    return { error: null }
  }

  const signOut = async () => {
    // Clear biometric credentials on logout
    if (Capacitor.isNativePlatform()) {
      await safeStorageRemove(BIOMETRIC_EMAIL_KEY)
      await safeStorageRemove(BIOMETRIC_PASSWORD_KEY)
      await safeStorageRemove(BIOMETRIC_ENABLED_KEY)
      await safeStorageRemove(LAST_ACTIVITY_KEY)
      setBiometricEnabled(false)
    }
    await supabase.auth.signOut()
  }

  const enableBiometricForCurrentUser = async (): Promise<boolean> => {
    if (!Capacitor.isNativePlatform() || !pendingCredentials) {
      return false
    }

    const { email, password } = pendingCredentials

    // Store credentials securely
    const results = await Promise.all([
      safeStorageSet(BIOMETRIC_EMAIL_KEY, email),
      safeStorageSet(BIOMETRIC_PASSWORD_KEY, password),
      safeStorageSet(BIOMETRIC_ENABLED_KEY, 'true'),
      safeStorageSet(LAST_ACTIVITY_KEY, Date.now().toString()),
      safeStorageSet(BIOMETRIC_PROMPT_SHOWN_KEY, 'true'),
    ])

    const allSucceeded = results.every(r => r)

    if (allSucceeded) {
      setBiometricEnabled(true)
      setShowBiometricPrompt(false)
      setPendingCredentials(null)
      console.log('[Auth] Biometric enabled successfully')
      return true
    } else {
      console.log('[Auth] Some storage operations failed')
      return false
    }
  }

  const disableBiometric = async () => {
    if (!Capacitor.isNativePlatform()) return

    await safeStorageRemove(BIOMETRIC_EMAIL_KEY)
    await safeStorageRemove(BIOMETRIC_PASSWORD_KEY)
    await safeStorageRemove(BIOMETRIC_ENABLED_KEY)
    await safeStorageRemove(LAST_ACTIVITY_KEY)

    setBiometricEnabled(false)
    console.log('[Auth] Biometric disabled successfully')
  }

  const dismissBiometricPrompt = () => {
    setShowBiometricPrompt(false)
    setPendingCredentials(null)
    // Mark as shown so we don't show again
    setBiometricPromptShown()
  }

  const setBiometricPromptShown = async () => {
    if (!Capacitor.isNativePlatform()) return
    await safeStorageSet(BIOMETRIC_PROMPT_SHOWN_KEY, 'true')
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        loading,
        biometricEnabled,
        biometricCheckComplete,
        showBiometricPrompt,
        pendingCredentials,
        signIn,
        signOut,
        enableBiometricForCurrentUser,
        disableBiometric,
        dismissBiometricPrompt,
        setBiometricPromptShown,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
