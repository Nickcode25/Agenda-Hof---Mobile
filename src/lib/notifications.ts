import { LocalNotifications, ScheduleOptions } from '@capacitor/local-notifications'
import { Capacitor } from '@capacitor/core'

// Chave para armazenar configurações de notificação no localStorage
const NOTIFICATION_SETTINGS_KEY = 'agendahof_notification_settings'

// Interface para configurações de notificação
export interface NotificationSettings {
  enabled: boolean
  minutesBefore: number // 30 minutos por padrão
  permission: 'granted' | 'denied' | 'default' | 'unknown'
}

// Configurações padrão
const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: false,
  minutesBefore: 30,
  permission: 'unknown',
}

// Verifica se está em plataforma nativa
export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform()
}

// Obtém configurações de notificação
export function getNotificationSettings(): NotificationSettings {
  try {
    const stored = localStorage.getItem(NOTIFICATION_SETTINGS_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.error('Error reading notification settings:', error)
  }
  return DEFAULT_SETTINGS
}

// Salva configurações de notificação
export function saveNotificationSettings(settings: NotificationSettings): void {
  try {
    localStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(settings))
  } catch (error) {
    console.error('Error saving notification settings:', error)
  }
}

// Verifica status da permissão de notificação
export async function checkNotificationPermission(): Promise<'granted' | 'denied' | 'default'> {
  if (isNativePlatform()) {
    try {
      const status = await LocalNotifications.checkPermissions()
      if (status.display === 'granted') return 'granted'
      if (status.display === 'denied') return 'denied'
      return 'default'
    } catch (error) {
      console.error('Error checking native notification permission:', error)
      return 'default'
    }
  } else {
    // Web - usa API de Notificações do navegador
    if (!('Notification' in window)) {
      return 'denied'
    }
    return Notification.permission as 'granted' | 'denied' | 'default'
  }
}

// Solicita permissão de notificação
export async function requestNotificationPermission(): Promise<'granted' | 'denied' | 'default'> {
  if (isNativePlatform()) {
    try {
      const status = await LocalNotifications.requestPermissions()
      const permission = status.display === 'granted' ? 'granted' : 'denied'

      // Atualiza configurações
      const settings = getNotificationSettings()
      settings.permission = permission
      if (permission === 'granted') {
        settings.enabled = true
      }
      saveNotificationSettings(settings)

      return permission
    } catch (error) {
      console.error('Error requesting native notification permission:', error)
      return 'denied'
    }
  } else {
    // Web - usa API de Notificações do navegador
    if (!('Notification' in window)) {
      return 'denied'
    }

    const permission = await Notification.requestPermission()

    // Atualiza configurações
    const settings = getNotificationSettings()
    settings.permission = permission
    if (permission === 'granted') {
      settings.enabled = true
    }
    saveNotificationSettings(settings)

    return permission
  }
}

// Inicializa notificações locais
export async function initLocalNotifications(): Promise<boolean> {
  if (!isNativePlatform()) {
    console.log('Local notifications only work on native platforms')
    return false
  }

  try {
    const permStatus = await LocalNotifications.requestPermissions()
    return permStatus.display === 'granted'
  } catch (error) {
    console.error('Error initializing local notifications:', error)
    return false
  }
}

// Agenda notificação de lembrete para consulta
export async function scheduleAppointmentReminder(
  appointmentId: string,
  patientName: string,
  procedure: string,
  appointmentTime: Date,
  minutesBefore: number = 60
): Promise<boolean> {
  if (!isNativePlatform()) {
    return false
  }

  try {
    // Calcula horário do lembrete
    const reminderTime = new Date(appointmentTime.getTime() - minutesBefore * 60 * 1000)

    // Se o horário já passou, não agenda
    if (reminderTime <= new Date()) {
      console.log('Reminder time already passed')
      return false
    }

    // Cria ID numérico único baseado no appointmentId
    const notificationId = Math.abs(hashCode(appointmentId))

    const options: ScheduleOptions = {
      notifications: [
        {
          id: notificationId,
          title: 'Lembrete de Consulta',
          body: `${patientName} - ${procedure} em ${minutesBefore} minutos`,
          schedule: { at: reminderTime },
          sound: 'default',
          actionTypeId: '',
          extra: {
            appointmentId,
            type: 'appointment_reminder',
          },
        },
      ],
    }

    await LocalNotifications.schedule(options)
    console.log(`Reminder scheduled for ${reminderTime.toISOString()}`)
    return true
  } catch (error) {
    console.error('Error scheduling reminder:', error)
    return false
  }
}

// Cancela lembrete de consulta
export async function cancelAppointmentReminder(appointmentId: string): Promise<boolean> {
  if (!isNativePlatform()) {
    return false
  }

  try {
    const notificationId = Math.abs(hashCode(appointmentId))
    await LocalNotifications.cancel({ notifications: [{ id: notificationId }] })
    return true
  } catch (error) {
    console.error('Error canceling reminder:', error)
    return false
  }
}

// Lista notificações pendentes
export async function getPendingNotifications() {
  if (!isNativePlatform()) {
    return []
  }

  try {
    const result = await LocalNotifications.getPending()
    return result.notifications
  } catch (error) {
    console.error('Error getting pending notifications:', error)
    return []
  }
}

// Hash simples para converter string em número
function hashCode(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32bit integer
  }
  return hash
}

// Configura listener para quando notificação é clicada
export function setupNotificationClickListener(
  onNotificationClick: (appointmentId: string) => void
) {
  if (!isNativePlatform()) {
    return
  }

  LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
    const extra = notification.notification.extra
    if (extra?.type === 'appointment_reminder' && extra?.appointmentId) {
      onNotificationClick(extra.appointmentId)
    }
  })
}
