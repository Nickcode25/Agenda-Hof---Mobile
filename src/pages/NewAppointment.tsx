import { useState, useEffect, FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { format } from 'date-fns'
import { Loader2, Search, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Header } from '@/components/layout/Header'
import { Avatar } from '@/components/ui/Avatar'
import type { Patient } from '@/types/database'

export function NewAppointmentPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Dados para seleção
  const [patients, setPatients] = useState<Patient[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showPatientSearch, setShowPatientSearch] = useState(false)

  // Campos do formulário
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [procedure, setProcedure] = useState('')
  const [date, setDate] = useState(searchParams.get('date') || format(new Date(), 'yyyy-MM-dd'))
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    fetchPatients()

    // Se veio com patient_id na URL, carregar o paciente
    const patientId = searchParams.get('patient_id')
    if (patientId) {
      fetchPatientById(patientId)
    }
  }, [])

  const fetchPatients = async () => {
    const { data } = await supabase
      .from('patients')
      .select('*')
      .eq('user_id', user!.id)
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (data) {
      setPatients(data)
    }
  }

  const fetchPatientById = async (patientId: string) => {
    const { data } = await supabase
      .from('patients')
      .select('*')
      .eq('id', patientId)
      .single()

    if (data) {
      setSelectedPatient(data)
    }
  }

  // Filtrar pacientes pela busca
  const filteredPatients = patients.filter(patient =>
    patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    patient.phone?.includes(searchQuery)
  )

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (!selectedPatient) {
      setError('Selecione um paciente')
      return
    }

    if (!procedure.trim()) {
      setError('Digite o procedimento')
      return
    }

    setLoading(true)

    try {
      // Montar timestamps completos
      const startDateTime = `${date}T${startTime}:00`
      const endDateTime = `${date}T${endTime}:00`

      const { error: insertError } = await supabase
        .from('appointments')
        .insert({
          user_id: user!.id,
          patient_id: selectedPatient.id,
          patient_name: selectedPatient.name,
          procedure: procedure.trim(),
          professional: user?.user_metadata?.full_name || user?.email || 'Profissional',
          start: startDateTime,
          end: endDateTime,
          notes: notes || null,
          status: 'scheduled',
        })

      if (insertError) throw insertError

      // Voltar para a agenda na data selecionada
      navigate('/', { replace: true })
    } catch (err: any) {
      console.error('Erro ao criar agendamento:', err)
      setError(err.message || 'Erro ao criar agendamento')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface-50 pb-20">
      <Header title="Novo Agendamento" showBack />

      <form onSubmit={handleSubmit} className="px-4 py-4 space-y-4">
        {/* Seleção de Paciente */}
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1.5">
            Paciente *
          </label>
          {selectedPatient ? (
            <div className="flex items-center gap-3 p-3 bg-white border border-surface-200 rounded-xl">
              <Avatar name={selectedPatient.name} src={selectedPatient.photo_url || undefined} size="md" />
              <div className="flex-1">
                <p className="font-medium text-surface-900">{selectedPatient.name}</p>
                {selectedPatient.phone && (
                  <p className="text-sm text-surface-500">{selectedPatient.phone}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedPatient(null)}
                className="p-2 text-surface-400 hover:text-surface-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setShowPatientSearch(true)
                }}
                onFocus={() => setShowPatientSearch(true)}
                className="input pl-10"
                placeholder="Buscar paciente..."
              />

              {/* Lista de pacientes */}
              {showPatientSearch && (
                <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-surface-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                  {filteredPatients.length === 0 ? (
                    <div className="p-4 text-center text-surface-500">
                      {searchQuery ? 'Nenhum paciente encontrado' : 'Digite para buscar'}
                    </div>
                  ) : (
                    filteredPatients.slice(0, 10).map((patient) => (
                      <button
                        key={patient.id}
                        type="button"
                        onClick={() => {
                          setSelectedPatient(patient)
                          setShowPatientSearch(false)
                          setSearchQuery('')
                        }}
                        className="w-full flex items-center gap-3 p-3 hover:bg-surface-50 transition-colors"
                      >
                        <Avatar name={patient.name} src={patient.photo_url || undefined} size="sm" />
                        <div className="text-left">
                          <p className="font-medium text-surface-900">{patient.name}</p>
                          {patient.phone && (
                            <p className="text-xs text-surface-500">{patient.phone}</p>
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Procedimento */}
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1.5">
            Procedimento *
          </label>
          <input
            type="text"
            value={procedure}
            onChange={(e) => setProcedure(e.target.value)}
            className="input"
            placeholder="Ex: Botox, Preenchimento labial..."
            required
          />
        </div>

        {/* Data */}
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1.5">
            Data *
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="input"
            required
          />
        </div>

        {/* Horários */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1.5">
              Início *
            </label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="input"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1.5">
              Término *
            </label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="input"
              required
            />
          </div>
        </div>

        {/* Observações */}
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1.5">
            Observações
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="input min-h-[80px] resize-none"
            placeholder="Observações sobre o agendamento..."
            rows={3}
          />
        </div>

        {error && (
          <p className="text-red-600 text-sm text-center">{error}</p>
        )}

        {/* Botão Salvar */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Agendando...
              </>
            ) : (
              'Criar Agendamento'
            )}
          </button>
        </div>
      </form>

      {/* Overlay para fechar busca */}
      {showPatientSearch && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowPatientSearch(false)}
        />
      )}
    </div>
  )
}
