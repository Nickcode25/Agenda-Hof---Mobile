import { useState, useEffect, useMemo, useRef } from 'react'
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
import { ChevronLeft, ChevronRight, Plus, ChevronDown, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Loading } from '@/components/ui/Loading'
import { TrialBanner } from '@/components/TrialBanner'
import type { Appointment } from '@/types/database'

type ViewMode = 'day' | 'week'

const statusColors: Record<string, string> = {
  scheduled: 'bg-orange-500',
  confirmed: 'bg-green-500',
  completed: 'bg-gray-400',
  done: 'bg-gray-400',
  cancelled: 'bg-red-500',
}

// Horários do dia (7h às 24h) com intervalos de 30 min
const TIME_SLOTS: { hour: number; minute: number; label: string }[] = []
for (let h = 7; h <= 23; h++) {
  TIME_SLOTS.push({ hour: h, minute: 0, label: `${String(h).padStart(2, '0')}:00` })
  TIME_SLOTS.push({ hour: h, minute: 30, label: `${String(h).padStart(2, '0')}:30` })
}
TIME_SLOTS.push({ hour: 24, minute: 0, label: '24:00' })

const SLOT_HEIGHT = 40 // pixels por slot de 30 min

export function AgendaPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<ViewMode>('day')
  const [appointments, setAppointments] = useState<Appointment[]>([])
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
  }, [dateRange, user])

  // Scroll para horário atual ao carregar
  useEffect(() => {
    if (scrollRef.current && !loading) {
      const currentHour = new Date().getHours()
      const currentMinute = new Date().getMinutes()
      const slotIndex = (currentHour - 7) * 2 + (currentMinute >= 30 ? 1 : 0)
      const scrollPosition = Math.max(0, slotIndex * SLOT_HEIGHT - 100)
      scrollRef.current.scrollTop = scrollPosition
    }
  }, [loading, viewMode])

  const fetchAppointments = async () => {
    setLoading(true)

    const startStr = format(dateRange.start, 'yyyy-MM-dd')
    const endStr = format(dateRange.end, 'yyyy-MM-dd')
    const dayStart = `${startStr}T00:00:00-03:00`
    const dayEnd = `${endStr}T23:59:59-03:00`

    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('user_id', user!.id)
      .gte('start', dayStart)
      .lte('start', dayEnd)
      .order('start', { ascending: true })

    if (!error && data) {
      setAppointments(data as Appointment[])
    } else if (error) {
      console.error('Erro ao buscar agendamentos:', error)
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

  // Dias da semana (começa na segunda)
  const weekDays = useMemo(() => {
    return eachDayOfInterval({
      start: startOfWeek(selectedDate, { weekStartsOn: 1 }),
      end: endOfWeek(selectedDate, { weekStartsOn: 1 }),
    })
  }, [selectedDate])

  return (
    <div className="h-screen bg-white flex flex-col pb-16 overflow-hidden">
      {/* Top Bar - Similar ao app */}
      <div className="bg-orange-500 text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={openDatePicker}
            className="flex items-center gap-1 text-sm font-medium"
          >
            <span>{format(selectedDate, "EEE, d MMMM yyyy", { locale: ptBR })}</span>
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
        <div className="flex bg-white/20 rounded-lg p-0.5">
          {(['day', 'week'] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                viewMode === mode ? 'bg-white text-orange-500' : 'text-white'
              }`}
            >
              {mode === 'day' ? 'Dia' : 'Semana'}
            </button>
          ))}
        </div>
      </div>

      {/* Trial Banner */}
      <TrialBanner />

      {/* Week Days Header - Sempre visível em day view */}
      {viewMode === 'day' && (
        <div className="bg-white border-b border-surface-200">
          <div className="flex">
            <div className="w-12 flex-shrink-0" />
            {weekDays.map((day) => (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDate(day)}
                className={`flex-1 py-2 text-center ${
                  isSameDay(day, selectedDate) ? 'bg-orange-50' : ''
                }`}
              >
                <div className="text-[10px] uppercase font-medium text-surface-400">
                  {format(day, 'EEEEE', { locale: ptBR })}
                </div>
                <div
                  className={`w-8 h-8 mx-auto flex items-center justify-center rounded-full text-sm font-semibold ${
                    isToday(day)
                      ? 'bg-orange-500 text-white'
                      : isSameDay(day, selectedDate)
                      ? 'bg-orange-100 text-orange-600'
                      : 'text-surface-700'
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
              selectedDate={selectedDate}
              appointments={getAppointmentsForDay(selectedDate)}
              navigate={navigate}
              scrollRef={scrollRef}
            />
          )}

          {viewMode === 'week' && (
            <WeekGridView
              weekDays={weekDays}
              getAppointmentsForDay={getAppointmentsForDay}
              navigate={navigate}
              scrollRef={scrollRef}
            />
          )}
        </>
      )}

      {/* FAB */}
      <button
        onClick={() => navigate(`/appointment/new?date=${format(selectedDate, 'yyyy-MM-dd')}`)}
        className="fixed bottom-20 right-4 w-14 h-14 bg-orange-500 text-white rounded-full shadow-lg flex items-center justify-center active:bg-orange-600 z-10"
      >
        <Plus className="w-6 h-6" />
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
            <div className="bg-orange-500 text-white px-4 py-3 flex items-center justify-between">
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
                        ? 'bg-orange-500 text-white'
                        : isSelected
                        ? 'bg-orange-100 text-orange-700'
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
                className="w-full py-2 text-orange-500 font-medium text-sm"
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

// Day Grid View - Full screen com 30 min slots
function DayGridView({
  selectedDate,
  appointments,
  navigate,
  scrollRef,
}: {
  selectedDate: Date
  appointments: Appointment[]
  navigate: (path: string) => void
  scrollRef: React.RefObject<HTMLDivElement>
}) {
  // Linha "dia todo"
  const allDayRow = (
    <div className="flex border-b border-surface-200 bg-surface-50">
      <div className="w-12 flex-shrink-0 py-2 text-right pr-2 text-xs text-surface-400">
        dia todo
      </div>
      <div className="flex-1 border-l border-surface-200 py-2 px-1">
        {/* Agendamentos de dia todo iriam aqui */}
      </div>
    </div>
  )

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {allDayRow}

      {/* Grid de horários */}
      <div ref={scrollRef} className="flex-1 overflow-auto">
        <div className="flex">
          {/* Coluna de horários */}
          <div className="w-12 flex-shrink-0 bg-white">
            {TIME_SLOTS.map((slot) => (
              <div
                key={slot.label}
                className="border-b border-surface-100 text-right pr-2 text-xs text-surface-400 flex items-start justify-end pt-0.5"
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
                className={`border-b ${slot.minute === 0 ? 'border-surface-200' : 'border-surface-100'}`}
                style={{ height: SLOT_HEIGHT }}
              />
            ))}

            {/* Agendamentos */}
            {appointments.map((apt) => {
              const startTime = parseISO(apt.start)
              const endTime = parseISO(apt.end)
              const startHour = getHours(startTime) + getMinutes(startTime) / 60
              const endHour = getHours(endTime) + getMinutes(endTime) / 60
              const startSlot = (startHour - 7) * 2
              const endSlot = (endHour - 7) * 2
              const top = startSlot * SLOT_HEIGHT
              const height = (endSlot - startSlot) * SLOT_HEIGHT

              return (
                <button
                  key={apt.id}
                  onClick={() => navigate(`/patient/${apt.patient_id}`)}
                  className={`absolute left-1 right-1 rounded-lg p-2 text-white text-left overflow-hidden ${
                    statusColors[apt.status] || 'bg-orange-500'
                  }`}
                  style={{
                    top: `${top}px`,
                    height: `${Math.max(height, SLOT_HEIGHT)}px`,
                  }}
                >
                  <div className="font-semibold text-sm truncate">{apt.patient_name}</div>
                  <div className="text-xs opacity-90">
                    {format(startTime, 'HH:mm')} - {format(endTime, 'HH:mm')}
                  </div>
                  {height > 60 && apt.procedure && (
                    <div className="text-xs mt-0.5 truncate opacity-80">{apt.procedure}</div>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// Week Grid View
function WeekGridView({
  weekDays,
  getAppointmentsForDay,
  navigate,
  scrollRef,
}: {
  weekDays: Date[]
  getAppointmentsForDay: (date: Date) => Appointment[]
  navigate: (path: string) => void
  scrollRef: React.RefObject<HTMLDivElement>
}) {
  // Altura maior para acomodar mais texto
  const WEEK_SLOT_HEIGHT = 50

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header com dias da semana */}
      <div className="flex border-b border-surface-200 bg-white">
        <div className="w-10 flex-shrink-0" />
        {weekDays.map((day) => (
          <div
            key={day.toISOString()}
            className={`flex-1 text-center py-1.5 border-l border-surface-100 ${
              isToday(day) ? 'bg-orange-50' : ''
            }`}
          >
            <div className="text-[10px] uppercase font-medium text-surface-400">
              {format(day, 'EEEEE', { locale: ptBR })}
            </div>
            <div
              className={`w-7 h-7 mx-auto flex items-center justify-center rounded-full text-sm font-bold ${
                isToday(day) ? 'bg-orange-500 text-white' : 'text-surface-900'
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
            const dayAppointments = getAppointmentsForDay(day)

            return (
              <div
                key={day.toISOString()}
                className={`flex-1 relative border-l border-surface-100 ${
                  isToday(day) ? 'bg-orange-50/30' : ''
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

                {/* Agendamentos */}
                {dayAppointments.map((apt) => {
                  const startTime = parseISO(apt.start)
                  const endTime = parseISO(apt.end)
                  const startHour = getHours(startTime) + getMinutes(startTime) / 60
                  const endHour = getHours(endTime) + getMinutes(endTime) / 60
                  const startSlot = (startHour - 7) * 2
                  const endSlot = (endHour - 7) * 2
                  const top = startSlot * WEEK_SLOT_HEIGHT
                  const height = (endSlot - startSlot) * WEEK_SLOT_HEIGHT

                  return (
                    <button
                      key={apt.id}
                      onClick={() => navigate(`/patient/${apt.patient_id}`)}
                      className={`absolute left-0.5 right-0.5 rounded p-1 text-white text-left overflow-hidden shadow-sm ${
                        statusColors[apt.status] || 'bg-orange-500'
                      }`}
                      style={{
                        top: `${top}px`,
                        height: `${Math.max(height, WEEK_SLOT_HEIGHT)}px`,
                      }}
                    >
                      <div className="text-[9px] font-medium leading-tight">
                        {format(startTime, 'HH:mm')}
                      </div>
                      <div className="text-[10px] font-bold truncate">
                        {apt.patient_name?.split(' ')[0]}
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

