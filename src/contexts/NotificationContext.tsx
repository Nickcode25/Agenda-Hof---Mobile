import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { supabase } from '@/lib/supabase'
import {
  initLocalNotifications,
  scheduleAppointmentReminder,
  cancelAppointmentReminder,
  setupNotificationClickListener,
  isNativePlatform,
  getNotificationSettings,
} from '@/lib/notifications'
import { parseISO, startOfDay, endOfDay, addDays } from 'date-fns'

interface NotificationContextType {
  notificationsEnabled: boolean
  scheduleRemindersForToday: () => Promise<void>
  refreshNotificationStatus: () => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}

interface NotificationProviderProps {
  children: ReactNode
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const { user } = useAuth()
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const navigate = useNavigate()

  // Função para verificar status das notificações
  const refreshNotificationStatus = () => {
    const settings = getNotificationSettings()
    setNotificationsEnabled(settings.enabled && settings.permission === 'granted')
  }

  // Inicializa notificações quando o app inicia
  useEffect(() => {
    async function init() {
      // Verifica configurações salvas
      refreshNotificationStatus()

      if (!isNativePlatform()) {
        return
      }

      // Inicializa notificações locais (solicita permissão se necessário)
      const localEnabled = await initLocalNotifications()
      if (localEnabled) {
        refreshNotificationStatus()
      }

      // Configura listener para quando notificação é clicada
      setupNotificationClickListener((_appointmentId) => {
        // Navega para a agenda quando clica na notificação
        navigate('/agenda')
      })
    }

    init()
  }, [navigate])

  // Agenda lembretes para consultas do dia quando usuário loga ou configuração muda
  useEffect(() => {
    if (user && notificationsEnabled) {
      scheduleRemindersForToday()
    }
  }, [user, notificationsEnabled])

  // Função para agendar lembretes para consultas de hoje e amanhã
  const scheduleRemindersForToday = async () => {
    if (!user) {
      return
    }

    // Verifica se notificações estão habilitadas
    const settings = getNotificationSettings()
    if (!settings.enabled || settings.permission !== 'granted') {
      return
    }

    // Para web, notificações locais agendadas não funcionam
    // Apenas plataforma nativa suporta agendamento
    if (!isNativePlatform()) {
      return
    }

    try {
      const now = new Date()
      const tomorrow = addDays(now, 1)

      // Busca consultas de hoje e amanhã
      const { data: appointments, error } = await supabase
        .from('appointments')
        .select('id, patient_name, procedure, start')
        .eq('user_id', user.id)
        .gte('start', startOfDay(now).toISOString())
        .lte('start', endOfDay(tomorrow).toISOString())
        .or('is_personal.is.null,is_personal.eq.false')
        .in('status', ['scheduled', 'confirmed'])
        .order('start', { ascending: true })

      if (error) {
        console.error('Error fetching appointments for reminders:', error)
        return
      }

      // Usa o tempo configurado pelo usuário
      const minutesBefore = settings.minutesBefore

      // Agenda lembrete para cada consulta
      for (const apt of appointments || []) {
        const appointmentTime = parseISO(apt.start)
        const reminderTime = new Date(appointmentTime.getTime() - minutesBefore * 60 * 1000)

        // Só agenda se o lembrete ainda não passou
        if (reminderTime > now) {
          await scheduleAppointmentReminder(
            apt.id,
            apt.patient_name,
            apt.procedure || 'Consulta',
            appointmentTime,
            minutesBefore
          )
        }
      }

      console.log(`Scheduled reminders for ${appointments?.length || 0} appointments`)
    } catch (error) {
      console.error('Error scheduling reminders:', error)
    }
  }

  return (
    <NotificationContext.Provider
      value={{
        notificationsEnabled,
        scheduleRemindersForToday,
        refreshNotificationStatus,
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

// Hook para agendar/cancelar lembrete de uma consulta específica
export function useAppointmentReminder() {
  const scheduleReminder = async (
    appointmentId: string,
    patientName: string,
    procedure: string,
    appointmentTime: Date
  ) => {
    const settings = getNotificationSettings()
    return scheduleAppointmentReminder(
      appointmentId,
      patientName,
      procedure,
      appointmentTime,
      settings.minutesBefore
    )
  }

  const cancelReminder = async (appointmentId: string) => {
    return cancelAppointmentReminder(appointmentId)
  }

  return { scheduleReminder, cancelReminder }
}
