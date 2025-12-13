import { useState } from 'react'
import { Bell, X } from 'lucide-react'
import {
  requestNotificationPermission,
  getNotificationSettings,
  saveNotificationSettings,
} from '@/lib/notifications'

interface NotificationPermissionModalProps {
  onClose: () => void
  onPermissionGranted?: () => void
}

export function NotificationPermissionModal({
  onClose,
  onPermissionGranted,
}: NotificationPermissionModalProps) {
  const [requesting, setRequesting] = useState(false)

  const handleAllow = async () => {
    setRequesting(true)
    const result = await requestNotificationPermission()

    if (result === 'granted') {
      // Salva que as notificações estão ativadas
      const settings = getNotificationSettings()
      settings.enabled = true
      settings.permission = 'granted'
      saveNotificationSettings(settings)

      onPermissionGranted?.()
    }

    // Marca que já solicitou permissão
    markPermissionAsked()
    setRequesting(false)
    onClose()
  }

  const handleDeny = () => {
    // Marca que já solicitou permissão (mesmo que negou)
    markPermissionAsked()
    onClose()
  }

  const markPermissionAsked = () => {
    localStorage.setItem('agendahof_notification_asked', 'true')
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl w-full max-w-sm shadow-xl overflow-hidden animate-slide-up">
        {/* Close button */}
        <button
          onClick={handleDeny}
          className="absolute top-3 right-3 p-1 text-surface-400 hover:text-surface-600"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Content */}
        <div className="p-6 pt-8 text-center">
          {/* Icon */}
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Bell className="w-8 h-8 text-primary-500" />
          </div>

          {/* Title */}
          <h2 className="text-xl font-bold text-surface-900 mb-2">
            Ativar notificações?
          </h2>

          {/* Description */}
          <p className="text-surface-500 text-sm mb-6">
            Receba lembretes antes de cada consulta para nunca perder um compromisso.
          </p>

          {/* Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleAllow}
              disabled={requesting}
              className="btn-primary w-full"
            >
              {requesting ? 'Solicitando...' : 'Permitir notificações'}
            </button>

            <button
              onClick={handleDeny}
              className="w-full py-3 text-surface-500 font-medium"
            >
              Agora não
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Função para verificar se deve mostrar o modal
export function shouldShowNotificationModal(): boolean {
  // Verifica se já perguntou antes
  const alreadyAsked = localStorage.getItem('agendahof_notification_asked')
  if (alreadyAsked === 'true') {
    return false
  }

  // Verifica se já tem permissão concedida
  const settings = getNotificationSettings()
  if (settings.permission === 'granted') {
    return false
  }

  return true
}
