import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { format, parseISO, differenceInYears } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Phone, Mail, Calendar, FileText, Edit2, MapPin, MessageCircle, Copy, Check, ChevronLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Avatar } from '@/components/ui/Avatar'
import { Loading } from '@/components/ui/Loading'
import type { Patient, Appointment } from '@/types/database'

const statusLabels: Record<string, string> = {
  scheduled: 'Agendado',
  confirmed: 'Confirmado',
  completed: 'Concluído',
  done: 'Concluído',
  cancelled: 'Cancelado',
}

const statusColors: Record<string, string> = {
  scheduled: 'bg-scheduled-light text-scheduled-dark',
  confirmed: 'bg-info-light text-info-dark',
  completed: 'bg-success-light text-success-dark',
  done: 'bg-success-light text-success-dark',
  cancelled: 'bg-error-light text-error-dark',
}

export function PatientDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [patient, setPatient] = useState<Patient | null>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [copiedPhone, setCopiedPhone] = useState(false)

  useEffect(() => {
    if (id) {
      fetchPatientData()
    }
  }, [id])

  const fetchPatientData = async () => {
    // Busca dados do paciente
    const { data: patientData } = await supabase
      .from('patients')
      .select('*')
      .eq('id', id!)
      .single()

    if (patientData) {
      setPatient(patientData)
    }

    // Busca histórico de agendamentos
    const { data: appointmentsData } = await supabase
      .from('appointments')
      .select('*')
      .eq('patient_id', id!)
      .order('start', { ascending: false })
      .limit(10)

    if (appointmentsData) {
      setAppointments(appointmentsData)
    }

    setLoading(false)
  }

  const calculateAge = (birthDate: string) => {
    return differenceInYears(new Date(), parseISO(birthDate))
  }

  const formatAppointmentDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), "d 'de' MMM 'de' yyyy", { locale: ptBR })
    } catch {
      return dateString
    }
  }

  const formatAppointmentTime = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'HH:mm')
    } catch {
      return '--:--'
    }
  }

  const copyPhoneToClipboard = async (phone: string) => {
    try {
      await navigator.clipboard.writeText(phone)
      setCopiedPhone(true)
      setTimeout(() => setCopiedPhone(false), 2000)
    } catch {
      // Fallback para navegadores sem suporte
    }
  }

  if (loading) {
    return <Loading fullScreen text="Carregando paciente..." />
  }

  if (!patient) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-surface-500">Paciente não encontrado</p>
      </div>
    )
  }

  // Formatar endereço completo
  const fullAddress = [
    patient.street,
    patient.number,
    patient.complement,
    patient.neighborhood,
    patient.city,
    patient.state,
  ].filter(Boolean).join(', ')

  // Formatar telefone para WhatsApp (remover caracteres não numéricos)
  const getWhatsAppNumber = (phone: string) => {
    const numbers = phone.replace(/\D/g, '')
    // Adiciona 55 (Brasil) se não tiver código do país
    if (numbers.length <= 11) {
      return `55${numbers}`
    }
    return numbers
  }

  const handleWhatsApp = () => {
    if (patient.phone) {
      const number = getWhatsAppNumber(patient.phone)
      window.open(`https://wa.me/${number}`, '_blank')
    }
  }

  const handleCall = () => {
    if (patient.phone) {
      window.location.href = `tel:${patient.phone}`
    }
  }

  return (
    <div className="min-h-screen bg-surface-50 pb-20">
      {/* Header compacto com Dynamic Island spacing */}
      <div className="bg-primary-500 text-white safe-area-top">
        {/* Extra padding for Dynamic Island */}
        <div className="h-2" />
        <div className="px-2 py-2 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-full active:bg-white/20 transition-colors"
            aria-label="Voltar"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-semibold">Paciente</h1>
          <button
            onClick={() => navigate(`/patient/${id}/edit`)}
            className="p-2 rounded-full active:bg-white/20 transition-colors"
            aria-label="Editar paciente"
          >
            <Edit2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Profile Section - Mais limpo */}
      <div className="bg-white px-4 pt-6 pb-5">
        <div className="flex flex-col items-center">
          <Avatar name={patient.name} src={patient.photo_url || undefined} size="lg" />
          <h1 className="text-xl font-bold text-surface-900 mt-3 text-center px-4">
            {patient.name}
          </h1>
          {patient.birth_date && (
            <p className="text-surface-400 text-sm mt-1">
              {calculateAge(patient.birth_date)} anos
            </p>
          )}

          {/* CTAs Primários - Mais espaçados */}
          {patient.phone && (
            <div className="flex gap-3 mt-5 w-full max-w-xs">
              <button
                onClick={handleCall}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-success text-white rounded-xl font-semibold active:bg-success-dark shadow-sm shadow-success/20 transition-all active:scale-[0.98]"
              >
                <Phone className="w-5 h-5" />
                Ligar
              </button>
              <button
                onClick={handleWhatsApp}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-whatsapp text-white rounded-xl font-semibold active:bg-whatsapp-hover shadow-sm shadow-whatsapp/20 transition-all active:scale-[0.98]"
              >
                <MessageCircle className="w-5 h-5" />
                WhatsApp
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Contact Info - Cards mais limpos */}
      <div className="px-4 py-4">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {patient.phone && (
            <div className="flex items-center gap-3 px-4 py-3 border-b border-surface-100">
              <div className="w-9 h-9 bg-success-light rounded-full flex items-center justify-center flex-shrink-0">
                <Phone className="w-4 h-4 text-success-dark" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-surface-400">Telefone</p>
                <p className="text-surface-900 font-medium">{patient.phone}</p>
              </div>
              <button
                onClick={() => copyPhoneToClipboard(patient.phone!)}
                className="p-2 rounded-full active:bg-surface-100 transition-colors"
                aria-label="Copiar telefone"
              >
                {copiedPhone ? (
                  <Check className="w-4 h-4 text-success" />
                ) : (
                  <Copy className="w-4 h-4 text-surface-400" />
                )}
              </button>
            </div>
          )}

          {patient.email && (
            <a
              href={`mailto:${patient.email}`}
              className="flex items-center gap-3 px-4 py-3 border-b border-surface-100 active:bg-surface-50 transition-colors"
            >
              <div className="w-9 h-9 bg-info-light rounded-full flex items-center justify-center flex-shrink-0">
                <Mail className="w-4 h-4 text-info-dark" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-surface-400">Email</p>
                <p className="text-surface-900 font-medium truncate">{patient.email}</p>
              </div>
            </a>
          )}

          {patient.birth_date && (
            <div className="flex items-center gap-3 px-4 py-3 border-b border-surface-100">
              <div className="w-9 h-9 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Calendar className="w-4 h-4 text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-surface-400">Data de nascimento</p>
                <p className="text-surface-900 font-medium">
                  {format(parseISO(patient.birth_date), "d 'de' MMMM 'de' yyyy", {
                    locale: ptBR,
                  })}
                </p>
              </div>
            </div>
          )}

          {fullAddress && (
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                <MapPin className="w-4 h-4 text-primary-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-surface-400">Endereço</p>
                <p className="text-surface-900 font-medium">{fullAddress}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Notes */}
      {patient.notes && (
        <div className="px-4 pb-4">
          <h2 className="text-xs font-bold text-surface-400 uppercase tracking-wider mb-2 px-1">
            Observações
          </h2>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-surface-700 text-sm whitespace-pre-wrap">{patient.notes}</p>
          </div>
        </div>
      )}

      {/* Clinical Info */}
      {patient.clinical_info && (
        <div className="px-4 pb-4">
          <h2 className="text-xs font-bold text-surface-400 uppercase tracking-wider mb-2 px-1">
            Informações Clínicas
          </h2>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-surface-700 text-sm whitespace-pre-wrap">{patient.clinical_info}</p>
          </div>
        </div>
      )}

      {/* Recent Appointments - Cards clicáveis */}
      <div className="px-4 pb-4">
        <h2 className="text-xs font-bold text-surface-400 uppercase tracking-wider mb-2 px-1">
          Histórico recente
        </h2>
        {appointments.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm text-center py-8">
            <FileText className="w-8 h-8 text-surface-300 mx-auto mb-2" />
            <p className="text-surface-500 text-sm">Nenhum agendamento</p>
          </div>
        ) : (
          <div className="space-y-2">
            {appointments.map((appointment) => (
              <div
                key={appointment.id}
                className="bg-white rounded-xl shadow-sm px-4 py-3 active:bg-surface-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-surface-900 text-sm">
                      {appointment.procedure || 'Consulta'}
                    </p>
                    <p className="text-xs text-surface-400 mt-0.5">
                      {formatAppointmentDate(appointment.start)} às {formatAppointmentTime(appointment.start)}
                    </p>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                      statusColors[appointment.status] || 'bg-surface-100 text-surface-600'
                    }`}
                  >
                    {statusLabels[appointment.status] || appointment.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
