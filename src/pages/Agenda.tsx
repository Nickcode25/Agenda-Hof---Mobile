import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import {
  format,
  addDays,
  subDays,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  isToday,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  getHours,
  getMinutes,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus, ChevronDown, Phone, MessageCircle, Check, X as XIcon, User, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Loading } from '@/components/ui/Loading'
import type { Appointment, RecurringBlock } from '@/types/database'

type ViewMode = 'day' | 'week'

// Tipo unificado para exibição na agenda
type AgendaItem = {
  id: string
  type: 'appointment' | 'block' | 'commitment'
  title: string
  start: Date
  end: Date
  status?: string
  patient_id?: string
  procedure?: string
}

const statusColors: Record<string, string> = {
  scheduled: 'bg-scheduled',        // Laranja suave (#FF9800)
  confirmed: 'bg-info',             // Azul (#2196F3)
  completed: 'bg-success',          // Verde institucional (#4CAF50)
  done: 'bg-success',               // Verde institucional (#4CAF50)
  cancelled: 'bg-error',            // Vermelho (#F44336)
}

// Horários do dia (7h às 24h) com intervalos de 30 min
const TIME_SLOTS: { hour: number; minute: number; label: string }[] = []
for (let h = 7; h <= 23; h++) {
  TIME_SLOTS.push({ hour: h, minute: 0, label: `${String(h).padStart(2, '0')}:00` })
  TIME_SLOTS.push({ hour: h, minute: 30, label: `${String(h).padStart(2, '0')}:30` })
}
TIME_SLOTS.push({ hour: 24, minute: 0, label: '24:00' })

// 40px por cada 15 minutos (80px por slot de 30 min, 160px por hora)
const PIXELS_PER_15MIN = 40
const SLOT_HEIGHT = PIXELS_PER_15MIN * 2 // 80px por slot de 30 min

export function AgendaPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<ViewMode>('day')
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [personalCommitments, setPersonalCommitments] = useState<Appointment[]>([])
  const [recurringBlocks, setRecurringBlocks] = useState<RecurringBlock[]>([])
  const [loading, setLoading] = useState(true)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [pickerMonth, setPickerMonth] = useState(new Date())
  const scrollRef = useRef<HTMLDivElement>(null)

  // Calcular range de datas baseado no modo de visualização
  // weekStartsOn: 1 = Segunda-feira
  const dateRange = useMemo(() => {
    if (viewMode === 'day') {
      return { start: selectedDate, end: selectedDate }
    } else {
      return {
        start: startOfWeek(selectedDate, { weekStartsOn: 1 }),
        end: endOfWeek(selectedDate, { weekStartsOn: 1 }),
      }
    }
  }, [selectedDate, viewMode])

  useEffect(() => {
    if (user) {
      fetchAppointments()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange, user])

  // Scroll para o primeiro agendamento do dia ou horário atual
  useEffect(() => {
    if (scrollRef.current && !loading) {
      // Pegar todos os itens do dia selecionado
      const allItems = [...appointments, ...personalCommitments]
      const dayItems = allItems.filter((item) => {
        try {
          return isSameDay(parseISO(item.start), selectedDate)
        } catch {
          return false
        }
      })

      // Também considerar bloqueios recorrentes
      const dayOfWeek = getDay(selectedDate)
      const dayBlocks = recurringBlocks.filter((block) => {
        let daysArray = block.days_of_week
        if (typeof daysArray === 'string') {
          try {
            daysArray = JSON.parse(daysArray)
          } catch {
            daysArray = []
          }
        }
        return Array.isArray(daysArray) && daysArray.includes(dayOfWeek)
      })

      let scrollHour = 7 // Default: início do dia
      let scrollMinute = 0

      if (dayItems.length > 0) {
        // Encontrar o primeiro agendamento do dia
        const sortedItems = dayItems.sort((a, b) =>
          new Date(a.start).getTime() - new Date(b.start).getTime()
        )
        const firstItem = sortedItems[0]
        const firstStart = parseISO(firstItem.start)
        scrollHour = getHours(firstStart)
        scrollMinute = getMinutes(firstStart)
      } else if (dayBlocks.length > 0) {
        // Se não há agendamentos mas há bloqueios, usar o primeiro bloqueio
        const sortedBlocks = dayBlocks.sort((a, b) =>
          a.start_time.localeCompare(b.start_time)
        )
        const [h, m] = sortedBlocks[0].start_time.split(':').map(Number)
        scrollHour = h
        scrollMinute = m
      } else {
        // Se não há nada, usar horário atual
        scrollHour = new Date().getHours()
        scrollMinute = new Date().getMinutes()
      }

      // Calcular posição de scroll (subtrair um pouco para dar margem)
      const minutesFrom7 = (scrollHour - 7) * 60 + scrollMinute
      const scrollPosition = Math.max(0, (minutesFrom7 / 15) * PIXELS_PER_15MIN - 40)
      scrollRef.current.scrollTop = scrollPosition
    }
  }, [loading, viewMode, selectedDate, appointments, personalCommitments, recurringBlocks])

  const fetchAppointments = async () => {
    setLoading(true)

    // Criar datas de início e fim do período no timezone local
    const startOfDay = new Date(dateRange.start)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(dateRange.end)
    endOfDay.setHours(23, 59, 59, 999)

    // Converter para ISO string (UTC)
    const dayStart = startOfDay.toISOString()
    const dayEnd = endOfDay.toISOString()

    // Buscar agendamentos normais (is_personal = false ou null)
    const { data: appointmentsData, error: appointmentsError } = await supabase
      .from('appointments')
      .select('*')
      .eq('user_id', user!.id)
      .gte('start', dayStart)
      .lte('start', dayEnd)
      .or('is_personal.is.null,is_personal.eq.false')
      .order('start', { ascending: true })

    if (!appointmentsError && appointmentsData) {
      setAppointments(appointmentsData as Appointment[])
    } else if (appointmentsError) {
      console.error('Erro ao buscar agendamentos:', appointmentsError)
    }

    // Buscar compromissos pessoais (is_personal = true)
    const { data: commitmentsData, error: commitmentsError } = await supabase
      .from('appointments')
      .select('*')
      .eq('user_id', user!.id)
      .eq('is_personal', true)
      .gte('start', dayStart)
      .lte('start', dayEnd)
      .order('start', { ascending: true })

    if (!commitmentsError && commitmentsData) {
      setPersonalCommitments(commitmentsData as Appointment[])
    } else if (commitmentsError) {
      console.error('Erro ao buscar compromissos:', commitmentsError)
    }

    // Buscar bloqueios recorrentes (busca todos os ativos)
    // Campo é 'active' não 'is_active', e user_id
    const { data: blocksData, error: blocksError } = await supabase
      .from('recurring_blocks')
      .select('*')
      .eq('user_id', user!.id)
      .eq('active', true)

    if (blocksError) {
      console.error('Erro ao buscar bloqueios:', blocksError)
    } else if (blocksData) {
      setRecurringBlocks(blocksData as RecurringBlock[])
    }

    setLoading(false)
  }

  // Navegação
  const goToPrevious = () => {
    if (viewMode === 'day') setSelectedDate(subDays(selectedDate, 1))
    else setSelectedDate(subWeeks(selectedDate, 1))
  }

  const goToNext = () => {
    if (viewMode === 'day') setSelectedDate(addDays(selectedDate, 1))
    else setSelectedDate(addWeeks(selectedDate, 1))
  }

  const goToToday = () => setSelectedDate(new Date())

  // Abrir date picker e sincronizar mês
  const openDatePicker = () => {
    setPickerMonth(selectedDate)
    setShowDatePicker(true)
  }

  // Selecionar data no picker
  const selectDate = (date: Date) => {
    setSelectedDate(date)
    setShowDatePicker(false)
  }

  // Dias do mês para o picker (semana começa na segunda)
  const pickerMonthDays = useMemo(() => {
    const start = startOfMonth(pickerMonth)
    const end = endOfMonth(pickerMonth)
    const days = eachDayOfInterval({ start, end })
    // Ajustar para começar na segunda (0=dom -> 6, 1=seg -> 0, etc)
    const startDay = getDay(start)
    const adjustedStartDay = startDay === 0 ? 6 : startDay - 1
    const emptyDays = Array(adjustedStartDay).fill(null)
    return [...emptyDays, ...days]
  }, [pickerMonth])

  // Filtrar agendamentos por dia
  const getAppointmentsForDay = (date: Date) => {
    return appointments.filter((apt) => {
      try {
        return isSameDay(parseISO(apt.start), date)
      } catch {
        return false
      }
    })
  }

  // Filtrar compromissos pessoais por dia
  const getCommitmentsForDay = (date: Date) => {
    return personalCommitments.filter((c) => {
      try {
        return isSameDay(parseISO(c.start), date)
      } catch {
        return false
      }
    })
  }

  // Filtrar bloqueios recorrentes por dia (verifica o dia da semana)
  const getBlocksForDay = (date: Date) => {
    const dayOfWeek = getDay(date) // 0=Domingo, 1=Segunda, etc.

    return recurringBlocks.filter((block) => {
      // days_of_week pode ser um array ou uma string JSON
      let daysArray = block.days_of_week
      if (typeof daysArray === 'string') {
        try {
          daysArray = JSON.parse(daysArray)
        } catch {
          daysArray = []
        }
      }

      return Array.isArray(daysArray) && daysArray.includes(dayOfWeek)
    })
  }

  // Combinar todos os itens para um dia (para o DayGridView)
  const getAllItemsForDay = (date: Date): AgendaItem[] => {
    const items: AgendaItem[] = []

    // Adicionar agendamentos
    getAppointmentsForDay(date).forEach((apt) => {
      items.push({
        id: apt.id,
        type: 'appointment',
        title: apt.patient_name,
        start: parseISO(apt.start),
        end: parseISO(apt.end),
        status: apt.status,
        patient_id: apt.patient_id,
        procedure: apt.procedure,
      })
    })

    // Adicionar compromissos pessoais (usam campo title ao invés de patient_name)
    getCommitmentsForDay(date).forEach((c) => {
      items.push({
        id: c.id,
        type: 'commitment',
        title: c.title || c.procedure || 'Compromisso',
        start: parseISO(c.start),
        end: parseISO(c.end),
        status: c.status,
      })
    })

    // Adicionar bloqueios recorrentes (converter horário para data)
    getBlocksForDay(date).forEach((block) => {
      const [startH, startM] = block.start_time.split(':').map(Number)
      const [endH, endM] = block.end_time.split(':').map(Number)

      const start = new Date(date)
      start.setHours(startH, startM, 0, 0)

      const end = new Date(date)
      end.setHours(endH, endM, 0, 0)

      items.push({
        id: block.id,
        type: 'block',
        title: block.title,
        start,
        end,
      })
    })

    return items.sort((a, b) => a.start.getTime() - b.start.getTime())
  }

  // Atualizar status de um agendamento - memoizado
  const updateAppointmentStatus = useCallback(async (id: string, status: string) => {
    const { error } = await supabase
      .from('appointments')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      console.error('Erro ao atualizar status:', error)
      return
    }

    // Atualizar lista local
    setAppointments((prev) =>
      prev.map((apt) => (apt.id === id ? { ...apt, status: status as Appointment['status'] } : apt))
    )
  }, [])

  const deleteAppointment = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Erro ao excluir agendamento:', error)
      return false
    }

    // Remover da lista local
    setAppointments((prev) => prev.filter((apt) => apt.id !== id))
    return true
  }, [])

  // Dias da semana (começa na segunda)
  const weekDays = useMemo(() => {
    return eachDayOfInterval({
      start: startOfWeek(selectedDate, { weekStartsOn: 1 }),
      end: endOfWeek(selectedDate, { weekStartsOn: 1 }),
    })
  }, [selectedDate])

  return (
    <div className="h-screen bg-white flex flex-col pb-16 overflow-hidden">
      {/* Top Bar - Estende até o topo da tela cobrindo a status bar */}
      <header className="sticky top-0 z-10 bg-primary-500 shadow-md text-white">
        {/* Área da status bar com cor sólida */}
        <div className="h-safe-top bg-primary-500" />
        <div className="flex items-center justify-between h-14 px-4">
          <button
            onClick={openDatePicker}
            className="flex items-center gap-1 active:opacity-80"
          >
            <span className="text-lg font-semibold capitalize text-white">
              {format(selectedDate, "d MMM", { locale: ptBR })}
            </span>
            <ChevronDown className="w-4 h-4 opacity-80 text-white" />
          </button>

          {/* Botão Hoje - aparece se não for hoje */}
          {!isToday(selectedDate) && (
            <button
              onClick={goToToday}
              className="text-xs font-medium bg-white/20 px-2.5 py-1 rounded-full active:bg-white/30"
            >
              Hoje
            </button>
          )}

          <div className="flex bg-white/20 rounded-lg p-0.5">
            {(['day', 'week'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  viewMode === mode ? 'bg-white text-primary-500' : 'text-white/90'
                }`}
              >
                {mode === 'day' ? 'Dia' : 'Semana'}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Week Days Header - Compacto com swipe */}
      {viewMode === 'day' && (
        <div className="bg-white border-b border-surface-100">
          <div className="flex">
            <div className="w-11 flex-shrink-0" />
            {weekDays.map((day) => (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDate(day)}
                className={`flex-1 py-1.5 text-center transition-colors ${
                  isSameDay(day, selectedDate) ? 'bg-primary-50' : ''
                }`}
              >
                <div className="text-[9px] uppercase font-semibold text-surface-400 mb-0.5">
                  {format(day, 'EEEEE', { locale: ptBR })}
                </div>
                <div
                  className={`w-7 h-7 mx-auto flex items-center justify-center rounded-full text-sm font-bold transition-all ${
                    isToday(day)
                      ? 'bg-primary-500 text-white shadow-sm shadow-primary-500/40'
                      : isSameDay(day, selectedDate)
                      ? 'bg-primary-100 text-primary-600'
                      : 'text-surface-600'
                  }`}
                >
                  {format(day, 'd')}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Navigation for week/month */}
      {viewMode !== 'day' && (
        <div className="bg-white border-b border-surface-200 px-4 py-2 flex items-center justify-between">
          <button onClick={goToPrevious} className="p-1">
            <ChevronLeft className="w-5 h-5 text-surface-600" />
          </button>
          <button onClick={goToToday} className="text-sm font-medium text-surface-700 capitalize">
            {viewMode === 'week'
              ? `${format(weekDays[0], "d 'de' MMM", { locale: ptBR })} - ${format(weekDays[6], "d 'de' MMM", { locale: ptBR })}`
              : format(selectedDate, "MMMM 'de' yyyy", { locale: ptBR })}
          </button>
          <button onClick={goToNext} className="p-1">
            <ChevronRight className="w-5 h-5 text-surface-600" />
          </button>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loading text="Carregando agenda..." />
        </div>
      ) : (
        <>
          {viewMode === 'day' && (
            <DayGridView
              items={getAllItemsForDay(selectedDate)}
              navigate={navigate}
              scrollRef={scrollRef}
              onUpdateStatus={updateAppointmentStatus}
              onDelete={deleteAppointment}
              isSelectedDateToday={isToday(selectedDate)}
            />
          )}

          {viewMode === 'week' && (
            <WeekGridView
              weekDays={weekDays}
              getAllItemsForDay={getAllItemsForDay}
              navigate={navigate}
              scrollRef={scrollRef}
            />
          )}
        </>
      )}

      {/* FAB - 56px para touch target ideal no iOS, posicionado acima da tab bar */}
      <button
        onClick={() => navigate(`/appointment/new?date=${format(selectedDate, 'yyyy-MM-dd')}`)}
        className="fixed bottom-24 right-4 w-14 h-14 bg-primary-500 text-white rounded-full shadow-lg shadow-primary-500/30 flex items-center justify-center active:scale-95 active:bg-primary-600 z-10 transition-transform"
        aria-label="Novo agendamento"
      >
        <Plus className="w-7 h-7" strokeWidth={2.5} />
      </button>

      {/* Date Picker Modal */}
      {showDatePicker && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setShowDatePicker(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-xl w-[90%] max-w-sm overflow-hidden">
            {/* Header do picker */}
            <div className="bg-primary-500 text-white px-4 py-3 flex items-center justify-between">
              <button
                onClick={() => setPickerMonth(subMonths(pickerMonth, 1))}
                className="p-1"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="font-semibold capitalize">
                {format(pickerMonth, "MMMM yyyy", { locale: ptBR })}
              </span>
              <button
                onClick={() => setPickerMonth(addMonths(pickerMonth, 1))}
                className="p-1"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Dias da semana (Seg a Dom) */}
            <div className="grid grid-cols-7 gap-1 px-3 pt-3">
              {['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((name, i) => (
                <div key={i} className="text-center text-xs font-medium text-surface-400 py-1">
                  {name}
                </div>
              ))}
            </div>

            {/* Grid de dias */}
            <div className="grid grid-cols-7 gap-1 p-3">
              {pickerMonthDays.map((day, index) => {
                if (!day) {
                  return <div key={`empty-${index}`} className="aspect-square" />
                }

                const isSelected = isSameDay(day, selectedDate)
                const isCurrentMonth = isSameMonth(day, pickerMonth)

                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => selectDate(day)}
                    className={`aspect-square flex items-center justify-center rounded-full text-sm font-medium transition-colors ${
                      isToday(day)
                        ? 'bg-primary-500 text-white'
                        : isSelected
                        ? 'bg-primary-100 text-primary-700'
                        : isCurrentMonth
                        ? 'text-surface-700 active:bg-surface-100'
                        : 'text-surface-300'
                    }`}
                  >
                    {format(day, 'd')}
                  </button>
                )
              })}
            </div>

            {/* Botão Hoje */}
            <div className="px-3 pb-3">
              <button
                onClick={() => {
                  setSelectedDate(new Date())
                  setShowDatePicker(false)
                }}
                className="w-full py-2 text-primary-500 font-medium text-sm"
              >
                Ir para hoje
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Cores por tipo de item
const itemColors: Record<string, string> = {
  appointment: 'bg-primary-500',
  block: 'bg-sky-300', // Azul claro como no site
  commitment: 'bg-sky-500',
}

// Day Grid View - Full screen com 30 min slots
function DayGridView({
  items,
  navigate,
  scrollRef,
  onUpdateStatus,
  onDelete,
  isSelectedDateToday,
}: {
  items: AgendaItem[]
  navigate: (path: string) => void
  scrollRef: React.RefObject<HTMLDivElement>
  onUpdateStatus: (id: string, status: string) => Promise<void>
  onDelete: (id: string) => Promise<boolean>
  isSelectedDateToday: boolean
}) {
  const [selectedItem, setSelectedItem] = useState<AgendaItem | null>(null)
  const [patientPhone, setPatientPhone] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [loadingPhone, setLoadingPhone] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())

  // Atualizar horário atual a cada minuto
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000) // Atualiza a cada 1 minuto
    return () => clearInterval(interval)
  }, [])

  // Calcular posição da linha do horário atual
  const nowLinePosition = useMemo(() => {
    if (!isSelectedDateToday) return null
    const now = currentTime
    const hours = getHours(now)
    const minutes = getMinutes(now)
    // Só mostrar se estiver no range visível (7h-24h)
    if (hours < 7) return null
    const minutesFrom7 = (hours - 7) * 60 + minutes
    return (minutesFrom7 / 15) * PIXELS_PER_15MIN
  }, [currentTime, isSelectedDateToday])

  // Buscar telefone do paciente quando seleciona um item
  const handleSelectItem = async (item: AgendaItem) => {
    setSelectedItem(item)
    setPatientPhone(null)

    if (item.patient_id) {
      setLoadingPhone(true)
      const { data } = await supabase
        .from('patients')
        .select('phone')
        .eq('id', item.patient_id)
        .single()

      if (data?.phone) {
        setPatientPhone(data.phone)
      }
      setLoadingPhone(false)
    }
  }

  // Formatar telefone para WhatsApp
  const getWhatsAppNumber = (phone: string) => {
    const numbers = phone.replace(/\D/g, '')
    if (numbers.length <= 11) {
      return `55${numbers}`
    }
    return numbers
  }

  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone}`
    setSelectedItem(null)
  }

  const handleWhatsApp = (phone: string) => {
    const number = getWhatsAppNumber(phone)
    window.open(`https://wa.me/${number}`, '_blank')
    setSelectedItem(null)
  }

  const handleConfirm = async (item: AgendaItem) => {
    setUpdating(true)
    await onUpdateStatus(item.id, 'confirmed')
    setUpdating(false)
    setSelectedItem(null)
  }

  const handleCancel = async (item: AgendaItem) => {
    setUpdating(true)
    await onUpdateStatus(item.id, 'cancelled')
    setUpdating(false)
    setSelectedItem(null)
  }

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true)
  }

  const handleDeleteConfirm = async () => {
    if (!selectedItem) return
    setDeleting(true)
    await onDelete(selectedItem.id)
    setDeleting(false)
    setShowDeleteConfirm(false)
    setSelectedItem(null)
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Grid de horários */}
      <div ref={scrollRef} className="flex-1 overflow-auto">
        <div className="flex">
          {/* Coluna de horários */}
          <div className="w-11 flex-shrink-0 bg-white">
            {TIME_SLOTS.map((slot) => (
              <div
                key={slot.label}
                className="border-b border-surface-100 text-right pr-1.5 text-[11px] text-surface-400 flex items-start justify-end pt-0.5"
                style={{ height: SLOT_HEIGHT }}
              >
                {slot.label}
              </div>
            ))}
          </div>

          {/* Coluna do dia com agendamentos */}
          <div className="flex-1 relative border-l border-surface-200 bg-white">
            {/* Linhas de cada slot */}
            {TIME_SLOTS.map((slot) => (
              <div
                key={slot.label}
                className={`border-b ${slot.minute === 0 ? 'border-surface-200' : 'border-surface-100/60'}`}
                style={{ height: SLOT_HEIGHT }}
              />
            ))}

            {/* Now Line - Linha do horário atual */}
            {nowLinePosition !== null && (
              <div
                className="absolute left-0 right-0 z-20 pointer-events-none"
                style={{ top: `${nowLinePosition}px` }}
              >
                <div className="relative flex items-center">
                  <div className="w-2 h-2 bg-red-500 rounded-full -ml-1 shadow-sm" />
                  <div className="flex-1 h-[2px] bg-red-500 shadow-sm" />
                </div>
              </div>
            )}

            {/* Itens da Agenda (agendamentos, bloqueios, compromissos) */}
            {items.map((item) => {
              const startHour = getHours(item.start) + getMinutes(item.start) / 60
              const endHour = getHours(item.end) + getMinutes(item.end) / 60
              // Calcular posição e altura baseado em 15 minutos = 40px
              const startMinutesFrom7 = (startHour - 7) * 60
              const endMinutesFrom7 = (endHour - 7) * 60
              const durationMinutes = endMinutesFrom7 - startMinutesFrom7
              const top = (startMinutesFrom7 / 15) * PIXELS_PER_15MIN
              const height = (durationMinutes / 15) * PIXELS_PER_15MIN
              const isSmall = durationMinutes <= 15 // 15 min ou menos

              // Definir cor baseada no tipo e status - cores mais suaves para bloqueios
              let bgColor = itemColors[item.type]
              if (item.type === 'appointment' && item.status) {
                bgColor = statusColors[item.status] || 'bg-primary-500'
              }

              // Handler de clique baseado no tipo
              const handleClick = () => {
                if (item.type === 'appointment') {
                  handleSelectItem(item)
                }
                // Bloqueios e compromissos não navegam por enquanto
              }

              return (
                <button
                  key={`${item.type}-${item.id}`}
                  onClick={handleClick}
                  className={`absolute left-1.5 right-1.5 rounded-lg text-white text-center overflow-hidden shadow-sm ${bgColor} ${isSmall ? 'px-2 py-0.5' : 'p-2'} active:opacity-90 transition-opacity flex flex-col items-center justify-center`}
                  style={{
                    top: `${top}px`,
                    height: `${Math.max(height, PIXELS_PER_15MIN)}px`,
                  }}
                >
                  {isSmall ? (
                    // Layout compacto para slots pequenos (15 min)
                    <div className="flex items-center justify-center gap-1 h-full w-full">
                      <span className="text-[10px] font-medium opacity-90 whitespace-nowrap">
                        {format(item.start, 'HH:mm')}
                      </span>
                      <span className="font-semibold text-xs truncate">
                        {item.title}
                      </span>
                    </div>
                  ) : (
                    // Layout expandido para slots maiores
                    <>
                      <div className="font-bold text-sm truncate w-full">{item.title}</div>
                      <div className="text-xs opacity-90 mt-0.5">
                        {format(item.start, 'HH:mm')} - {format(item.end, 'HH:mm')}
                      </div>
                    </>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Modal de Ações Rápidas */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSelectedItem(null)}
          />
          <div className="relative bg-white rounded-t-3xl w-full max-w-lg safe-area-bottom animate-slide-up">
            {/* Header */}
            <div className="p-4 border-b border-surface-100">
              <div className="w-10 h-1 bg-surface-300 rounded-full mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-surface-900 text-center">
                {selectedItem.title}
              </h3>
              <p className="text-sm text-surface-500 text-center mt-1">
                {format(selectedItem.start, 'HH:mm')} - {format(selectedItem.end, 'HH:mm')}
                {selectedItem.procedure && ` • ${selectedItem.procedure}`}
              </p>
              {selectedItem.status && (
                <div className="flex justify-center mt-2">
                  <span
                    className={`text-xs font-medium px-3 py-1 rounded-full ${
                      selectedItem.status === 'confirmed'
                        ? 'bg-info-light text-info-dark'
                        : selectedItem.status === 'cancelled'
                        ? 'bg-error-light text-error-dark'
                        : selectedItem.status === 'completed' || selectedItem.status === 'done'
                        ? 'bg-success-light text-success-dark'
                        : 'bg-scheduled-light text-scheduled-dark'
                    }`}
                  >
                    {selectedItem.status === 'scheduled' && 'Agendado'}
                    {selectedItem.status === 'confirmed' && 'Confirmado'}
                    {selectedItem.status === 'cancelled' && 'Cancelado'}
                    {(selectedItem.status === 'completed' || selectedItem.status === 'done') && 'Concluído'}
                  </span>
                </div>
              )}
            </div>

            {/* Ações */}
            <div className="p-4 space-y-2">
              {/* Contato (se tiver telefone) */}
              {loadingPhone ? (
                <div className="flex justify-center py-3">
                  <div className="w-5 h-5 border-2 border-surface-300 border-t-primary-500 rounded-full animate-spin" />
                </div>
              ) : patientPhone && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCall(patientPhone)}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-success text-white rounded-xl font-medium active:bg-success-dark"
                  >
                    <Phone className="w-5 h-5" />
                    Ligar
                  </button>
                  <button
                    onClick={() => handleWhatsApp(patientPhone)}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-whatsapp text-white rounded-xl font-medium active:bg-whatsapp-hover"
                  >
                    <MessageCircle className="w-5 h-5" />
                    WhatsApp
                  </button>
                </div>
              )}

              {/* Alterar Status (apenas para agendamentos não finalizados) */}
              {selectedItem.status !== 'completed' && selectedItem.status !== 'done' && selectedItem.status !== 'cancelled' && (
                <div className="flex gap-2">
                  {selectedItem.status !== 'confirmed' && (
                    <button
                      onClick={() => handleConfirm(selectedItem)}
                      disabled={updating}
                      className="flex-1 flex items-center justify-center gap-2 py-3 bg-info text-white rounded-xl font-medium active:bg-info-dark disabled:opacity-50"
                    >
                      <Check className="w-5 h-5" />
                      {updating ? 'Atualizando...' : 'Confirmar'}
                    </button>
                  )}
                  <button
                    onClick={() => handleCancel(selectedItem)}
                    disabled={updating}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-error text-white rounded-xl font-medium active:bg-error-dark disabled:opacity-50"
                  >
                    <XIcon className="w-5 h-5" />
                    {updating ? 'Atualizando...' : 'Cancelar'}
                  </button>
                </div>
              )}

              {/* Ver Paciente */}
              {selectedItem.patient_id && (
                <button
                  onClick={() => {
                    navigate(`/patient/${selectedItem.patient_id}`)
                    setSelectedItem(null)
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-surface-100 text-surface-700 rounded-xl font-medium active:bg-surface-200"
                >
                  <User className="w-5 h-5" />
                  Ver Paciente
                </button>
              )}

              {/* Excluir Agendamento */}
              {selectedItem.type === 'appointment' && (
                <button
                  onClick={handleDeleteClick}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-red-50 text-red-600 rounded-xl font-medium active:bg-red-100 border border-red-200"
                >
                  <Trash2 className="w-5 h-5" />
                  Excluir Agendamento
                </button>
              )}
            </div>

            {/* Botão Fechar */}
            <div className="p-4 pt-0">
              <button
                onClick={() => setSelectedItem(null)}
                className="w-full py-3 text-surface-500 font-medium"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão - Estilo iOS */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowDeleteConfirm(false)}
          />
          <div className="relative bg-white/95 backdrop-blur-xl rounded-2xl w-full max-w-[270px] shadow-xl overflow-hidden">
            <div className="p-4 text-center">
              <h3 className="text-[17px] font-semibold text-surface-900">
                Excluir Agendamento?
              </h3>
              <p className="text-[13px] text-surface-500 mt-1">
                Esta ação não pode ser desfeita.
              </p>
            </div>
            <div className="border-t border-surface-200">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="w-full py-3 text-[17px] text-primary-500 font-normal border-b border-surface-200 active:bg-surface-100"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="w-full py-3 text-[17px] text-red-500 font-semibold active:bg-surface-100 disabled:opacity-50"
              >
                {deleting ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Week Grid View
function WeekGridView({
  weekDays,
  getAllItemsForDay,
  navigate,
  scrollRef,
}: {
  weekDays: Date[]
  getAllItemsForDay: (date: Date) => AgendaItem[]
  navigate: (path: string) => void
  scrollRef: React.RefObject<HTMLDivElement>
}) {
  // 40px por 15 min na semana também
  const WEEK_PIXELS_PER_15MIN = 40
  const WEEK_SLOT_HEIGHT = WEEK_PIXELS_PER_15MIN * 2 // 80px por 30 min

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header com dias da semana */}
      <div className="flex border-b border-surface-200 bg-white">
        <div className="w-10 flex-shrink-0" />
        {weekDays.map((day) => (
          <div
            key={day.toISOString()}
            className={`flex-1 text-center py-1.5 border-l border-surface-100 ${
              isToday(day) ? 'bg-primary-50' : ''
            }`}
          >
            <div className="text-[10px] uppercase font-medium text-surface-400">
              {format(day, 'EEEEE', { locale: ptBR })}
            </div>
            <div
              className={`w-7 h-7 mx-auto flex items-center justify-center rounded-full text-sm font-bold ${
                isToday(day) ? 'bg-primary-500 text-white' : 'text-surface-900'
              }`}
            >
              {format(day, 'd')}
            </div>
          </div>
        ))}
      </div>

      {/* Grid de horários */}
      <div ref={scrollRef} className="flex-1 overflow-auto">
        <div className="flex">
          {/* Coluna de horários */}
          <div className="w-10 flex-shrink-0 bg-white">
            {TIME_SLOTS.filter((s) => s.minute === 0).map((slot) => (
              <div
                key={slot.label}
                className="border-b border-surface-100 text-right pr-1 text-[10px] text-surface-400"
                style={{ height: WEEK_SLOT_HEIGHT * 2 }}
              >
                {slot.label}
              </div>
            ))}
          </div>

          {/* Colunas dos dias */}
          {weekDays.map((day) => {
            const dayItems = getAllItemsForDay(day)

            return (
              <div
                key={day.toISOString()}
                className={`flex-1 relative border-l border-surface-100 ${
                  isToday(day) ? 'bg-primary-50/30' : ''
                }`}
                style={{ minWidth: '40px' }}
              >
                {/* Linhas de hora */}
                {TIME_SLOTS.filter((s) => s.minute === 0).map((slot) => (
                  <div
                    key={slot.label}
                    className="border-b border-surface-100"
                    style={{ height: WEEK_SLOT_HEIGHT * 2 }}
                  />
                ))}

                {/* Itens da Agenda */}
                {dayItems.map((item) => {
                  const startHour = getHours(item.start) + getMinutes(item.start) / 60
                  const endHour = getHours(item.end) + getMinutes(item.end) / 60
                  // Calcular posição e altura baseado em 15 minutos = 40px
                  const startMinutesFrom7 = (startHour - 7) * 60
                  const endMinutesFrom7 = (endHour - 7) * 60
                  const durationMinutes = endMinutesFrom7 - startMinutesFrom7
                  const top = (startMinutesFrom7 / 15) * WEEK_PIXELS_PER_15MIN
                  const height = (durationMinutes / 15) * WEEK_PIXELS_PER_15MIN

                  // Definir cor baseada no tipo e status
                  let bgColor = itemColors[item.type]
                  if (item.type === 'appointment' && item.status) {
                    bgColor = statusColors[item.status] || 'bg-primary-500'
                  }

                  // Handler de clique
                  const handleClick = () => {
                    if (item.type === 'appointment' && item.patient_id) {
                      navigate(`/patient/${item.patient_id}`)
                    }
                  }

                  return (
                    <button
                      key={`${item.type}-${item.id}`}
                      onClick={handleClick}
                      className={`absolute left-0.5 right-0.5 rounded p-1 text-white text-center overflow-hidden shadow-sm ${bgColor} flex flex-col items-center justify-center`}
                      style={{
                        top: `${top}px`,
                        height: `${Math.max(height, WEEK_PIXELS_PER_15MIN)}px`,
                      }}
                    >
                      <div className="text-[9px] font-medium leading-tight">
                        {format(item.start, 'HH:mm')}
                      </div>
                      <div className="text-[10px] font-bold truncate w-full">
                        {item.title.split(' ')[0]}
                      </div>
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

