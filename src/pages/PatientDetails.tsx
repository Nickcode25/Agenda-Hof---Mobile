import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { format, parseISO, differenceInYears } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Phone, Mail, Calendar, FileText, Edit2, MapPin, Copy, Check, ChevronLeft } from 'lucide-react'

// WhatsApp icon component
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
)
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
      {/* Header compacto com safe area para status bar */}
      <div className="bg-primary-500 text-white">
        {/* Safe area top */}
        <div className="h-safe-top bg-primary-500" />
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
                <WhatsAppIcon className="w-5 h-5" />
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
