import { LocalNotifications, ScheduleOptions } from '@capacitor/local-notifications'
import { PushNotifications } from '@capacitor/push-notifications'
import { Capacitor } from '@capacitor/core'

// Verifica se está em plataforma nativa
export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform()
}

// Inicializa notificações push
export async function initPushNotifications(): Promise<string | null> {
  if (!isNativePlatform()) {
    console.log('Push notifications only work on native platforms')
    return null
  }

  try {
    // Solicita permissão
    const permStatus = await PushNotifications.requestPermissions()

    if (permStatus.receive !== 'granted') {
      console.log('Push notification permission denied')
      return null
    }

    // Registra para receber notificações
    await PushNotifications.register()

    // Configura listeners
    PushNotifications.addListener('registration', (token) => {
      console.log('Push registration success, token:', token.value)
      // Aqui você pode enviar o token para o backend
    })

    PushNotifications.addListener('registrationError', (error) => {
      console.error('Push registration error:', error.error)
    })

    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Push notification received:', notification)
    })

    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.log('Push notification action performed:', notification)
    })

    return 'registered'
  } catch (error) {
    console.error('Error initializing push notifications:', error)
    return null
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
