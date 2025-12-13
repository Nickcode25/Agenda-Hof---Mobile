import { useState, useEffect } from 'react'
import { Header } from '@/components/layout/Header'
import { Bell, BellOff, Check, AlertCircle } from 'lucide-react'
import { useNotifications } from '@/contexts/NotificationContext'
import {
  isNativePlatform,
  getNotificationSettings,
  saveNotificationSettings,
  checkNotificationPermission,
  requestNotificationPermission,
  type NotificationSettings,
} from '@/lib/notifications'

export function NotificationsPage() {
  const {
    refreshNotificationStatus,
    scheduleRemindersForToday,
  } = useNotifications()
  const [settings, setSettings] = useState<NotificationSettings>(getNotificationSettings())
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'default'>('default')
  const [requesting, setRequesting] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [showDeniedModal, setShowDeniedModal] = useState(false)

  useEffect(() => {
    checkPermission()
  }, [])

  const checkPermission = async () => {
    const status = await checkNotificationPermission()
    setPermissionStatus(status)

    // Atualiza settings com status da permissao
    const currentSettings = getNotificationSettings()
    if (currentSettings.permission !== status) {
      const updatedSettings = { ...currentSettings, permission: status }
      saveNotificationSettings(updatedSettings)
      setSettings(updatedSettings)
    }
  }

  const handleRequestPermission = async () => {
    setRequesting(true)

    const result = await requestNotificationPermission()
    setPermissionStatus(result)

    const updatedSettings = {
      ...settings,
      permission: result,
      enabled: result === 'granted',
    }
    saveNotificationSettings(updatedSettings)
    setSettings(updatedSettings)

    // Atualiza o contexto e reagenda notificações
    refreshNotificationStatus()
    if (result === 'granted') {
      scheduleRemindersForToday()
    }

    setRequesting(false)

    if (result === 'granted') {
      setShowSuccessModal(true)
    } else if (result === 'denied') {
      setShowDeniedModal(true)
    }
  }

  const handleToggleNotifications = async () => {
    if (permissionStatus !== 'granted') {
      await handleRequestPermission()
      return
    }

    const newEnabled = !settings.enabled
    const updatedSettings = {
      ...settings,
      enabled: newEnabled,
    }
    saveNotificationSettings(updatedSettings)
    setSettings(updatedSettings)

    // Atualiza o contexto e reagenda notificações se ativou
    refreshNotificationStatus()
    if (newEnabled) {
      scheduleRemindersForToday()
    }
  }

  const handleMinutesChange = (minutes: number) => {
    const updatedSettings = {
      ...settings,
      minutesBefore: minutes,
    }
    saveNotificationSettings(updatedSettings)
    setSettings(updatedSettings)

    // Reagenda notificações com novo tempo
    refreshNotificationStatus()
    scheduleRemindersForToday()
  }

  const minutesOptions = [15, 30, 60, 120]

  const getMinutesLabel = (minutes: number) => {
    if (minutes < 60) return `${minutes} minutos`
    if (minutes === 60) return '1 hora'
    return `${minutes / 60} horas`
  }

  return (
    <div className="min-h-screen bg-surface-50 pb-20">
      <Header title="Notificações" showBack />

      <div className="px-4 py-4 space-y-4">
        {/* Status atual */}
        <div className="card">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              settings.enabled && permissionStatus === 'granted'
                ? 'bg-success-light'
                : 'bg-surface-100'
            }`}>
              {settings.enabled && permissionStatus === 'granted' ? (
                <Bell className="w-6 h-6 text-success-dark" />
              ) : (
                <BellOff className="w-6 h-6 text-surface-400" />
              )}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-surface-900">
                {settings.enabled && permissionStatus === 'granted'
                  ? 'Notificações ativadas'
                  : 'Notificações desativadas'}
              </h3>
              <p className="text-sm text-surface-500">
                {permissionStatus === 'granted'
                  ? settings.enabled
                    ? `Lembretes ${getMinutesLabel(settings.minutesBefore)} antes`
                    : 'Ative para receber lembretes'
                  : permissionStatus === 'denied'
                    ? 'Permissão negada nas configurações'
                    : 'Permissão não solicitada'}
              </p>
            </div>
          </div>
        </div>

        {/* Toggle de ativação */}
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-surface-900">Lembretes de consulta</h4>
              <p className="text-sm text-surface-500">
                Receba lembretes antes de cada consulta
              </p>
            </div>
            <button
              onClick={handleToggleNotifications}
              disabled={requesting}
              className={`w-14 h-8 rounded-full transition-colors relative ${
                settings.enabled && permissionStatus === 'granted'
                  ? 'bg-success'
                  : 'bg-surface-300'
              }`}
            >
              <div
                className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-sm transition-transform ${
                  settings.enabled && permissionStatus === 'granted'
                    ? 'translate-x-7'
                    : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Opções de tempo (só mostra se notificações estão ativas) */}
        {settings.enabled && permissionStatus === 'granted' && (
          <div className="card">
            <h4 className="font-medium text-surface-900 mb-3">Tempo de antecedência</h4>
            <div className="grid grid-cols-2 gap-2">
              {minutesOptions.map((minutes) => (
                <button
                  key={minutes}
                  onClick={() => handleMinutesChange(minutes)}
                  className={`py-3 px-4 rounded-xl text-center transition-colors ${
                    settings.minutesBefore === minutes
                      ? 'bg-primary-500 text-white font-medium'
                      : 'bg-surface-100 text-surface-700 active:bg-surface-200'
                  }`}
                >
                  {getMinutesLabel(minutes)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Resumo diário - desabilitado temporariamente (requer Apple Developer Program)
        {isPushNotificationSupported() && (
          <div className="card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  dailySummaryEnabled
                    ? 'bg-amber-100'
                    : 'bg-surface-100'
                }`}>
                  <Sunrise className={`w-5 h-5 ${
                    dailySummaryEnabled ? 'text-amber-600' : 'text-surface-400'
                  }`} />
                </div>
                <div>
                  <h4 className="font-medium text-surface-900">Resumo diário às 7h</h4>
                  <p className="text-sm text-surface-500">
                    Receba um resumo dos pacientes do dia
                  </p>
                </div>
              </div>
              <button
                onClick={handleToggleDailySummary}
                disabled={togglingDailySummary}
                className={`w-14 h-8 rounded-full transition-colors relative ${
                  dailySummaryEnabled
                    ? 'bg-success'
                    : 'bg-surface-300'
                } ${togglingDailySummary ? 'opacity-50' : ''}`}
              >
                <div
                  className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-sm transition-transform ${
                    dailySummaryEnabled
                      ? 'translate-x-7'
                      : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            {dailySummaryEnabled && (
              <p className="text-xs text-surface-400 mt-3 pl-13">
                Todo dia às 7h você receberá uma notificação com o número de pacientes
                agendados e o nome do primeiro paciente do dia.
              </p>
            )}
          </div>
        )}
        */}

        {/* Aviso se permissão negada */}
        {permissionStatus === 'denied' && (
          <div className="card bg-warning-light border border-warning">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-warning-dark flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-warning-dark">Permissão negada</h4>
                <p className="text-sm text-warning-dark/80 mt-1">
                  {isNativePlatform()
                    ? 'Para ativar notificações, acesse as configurações do seu dispositivo e permita notificações para o AgendaHOF.'
                    : 'Para ativar notificações, clique no ícone de cadeado na barra de endereços do navegador e permita notificações.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Botão de solicitar permissão (se ainda não solicitou) */}
        {permissionStatus === 'default' && (
          <button
            onClick={handleRequestPermission}
            disabled={requesting}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            <Bell className="w-5 h-5" />
            {requesting ? 'Solicitando...' : 'Ativar notificações'}
          </button>
        )}

        {/* Info */}
        <div className="pt-4">
          <p className="text-sm text-surface-400 text-center">
            Você receberá um lembrete antes de cada consulta agendada.
          </p>
        </div>
      </div>

      {/* Success Modal - iOS Style */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowSuccessModal(false)}
          />
          <div className="relative bg-white/95 backdrop-blur-xl rounded-2xl w-full max-w-[270px] shadow-xl overflow-hidden">
            <div className="p-4 text-center">
              <div className="w-12 h-12 bg-success-light rounded-full flex items-center justify-center mx-auto mb-3">
                <Check className="w-6 h-6 text-success" />
              </div>
              <h3 className="text-[17px] font-semibold text-surface-900">
                Notificações ativadas!
              </h3>
              <p className="text-[13px] text-surface-500 mt-1">
                Você receberá lembretes {getMinutesLabel(settings.minutesBefore)} antes de cada consulta.
              </p>
            </div>
            <div className="border-t border-surface-200">
              <button
                onClick={() => setShowSuccessModal(false)}
                className="w-full py-3 text-[17px] text-primary-500 font-semibold active:bg-surface-100"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Denied Modal - iOS Style */}
      {showDeniedModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowDeniedModal(false)}
          />
          <div className="relative bg-white/95 backdrop-blur-xl rounded-2xl w-full max-w-[270px] shadow-xl overflow-hidden">
            <div className="p-4 text-center">
              <div className="w-12 h-12 bg-error-light rounded-full flex items-center justify-center mx-auto mb-3">
                <BellOff className="w-6 h-6 text-error" />
              </div>
              <h3 className="text-[17px] font-semibold text-surface-900">
                Permissão negada
              </h3>
              <p className="text-[13px] text-surface-500 mt-1">
                Você pode ativar as notificações nas configurações do seu dispositivo.
              </p>
            </div>
            <div className="border-t border-surface-200">
              <button
                onClick={() => setShowDeniedModal(false)}
                className="w-full py-3 text-[17px] text-primary-500 font-semibold active:bg-surface-100"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
