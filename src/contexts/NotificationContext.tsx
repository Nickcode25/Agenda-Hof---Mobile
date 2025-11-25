import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { supabase } from '@/lib/supabase'
import {
  initLocalNotifications,
  initPushNotifications,
  scheduleAppointmentReminder,
  cancelAppointmentReminder,
  setupNotificationClickListener,
  isNativePlatform,
} from '@/lib/notifications'
import { parseISO, startOfDay, endOfDay, addDays } from 'date-fns'

interface NotificationContextType {
  notificationsEnabled: boolean
  scheduleRemindersForToday: () => Promise<void>
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

  // Inicializa notificações quando o app inicia
  useEffect(() => {
    async function init() {
      if (!isNativePlatform()) {
        return
      }

      // Inicializa notificações locais
      const localEnabled = await initLocalNotifications()
      setNotificationsEnabled(localEnabled)

      // Inicializa push notifications
      await initPushNotifications()

      // Configura listener para quando notificação é clicada
      setupNotificationClickListener((_appointmentId) => {
        // Navega para a agenda quando clica na notificação
        navigate('/agenda')
      })
    }

    init()
  }, [navigate])

  // Agenda lembretes para consultas do dia quando usuário loga
  useEffect(() => {
    if (user && notificationsEnabled) {
      scheduleRemindersForToday()
    }
  }, [user, notificationsEnabled])

  // Função para agendar lembretes para consultas de hoje e amanhã
  const scheduleRemindersForToday = async () => {
    if (!user || !isNativePlatform()) {
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

      // Agenda lembrete para cada consulta (60 min antes)
      for (const apt of appointments || []) {
        const appointmentTime = parseISO(apt.start)
        const reminderTime = new Date(appointmentTime.getTime() - 60 * 60 * 1000)

        // Só agenda se o lembrete ainda não passou
        if (reminderTime > now) {
          await scheduleAppointmentReminder(
            apt.id,
            apt.patient_name,
            apt.procedure || 'Consulta',
            appointmentTime,
            60 // 60 minutos antes
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
    return scheduleAppointmentReminder(appointmentId, patientName, procedure, appointmentTime, 60)
  }

  const cancelReminder = async (appointmentId: string) => {
    return cancelAppointmentReminder(appointmentId)
  }

  return { scheduleReminder, cancelReminder }
}
