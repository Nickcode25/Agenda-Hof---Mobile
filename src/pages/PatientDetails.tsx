import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { format, parseISO, differenceInYears } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Phone, Mail, Calendar, FileText, Edit2, MapPin, MessageCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Header } from '@/components/layout/Header'
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

export function PatientDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [patient, setPatient] = useState<Patient | null>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)

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
      <Header
        title="Paciente"
        showBack
        rightAction={
          <button
            onClick={() => navigate(`/patient/${id}/edit`)}
            className="p-2 rounded-full active:bg-surface-100"
          >
            <Edit2 className="w-5 h-5 text-surface-600" />
          </button>
        }
      />

      {/* Profile Section */}
      <div className="bg-white px-4 py-6 border-b border-surface-100">
        <div className="flex flex-col items-center">
          <Avatar name={patient.name} src={patient.photo_url || undefined} size="lg" />
          <h1 className="text-xl font-semibold text-surface-900 mt-3">
            {patient.name}
          </h1>
          {patient.birth_date && (
            <p className="text-surface-500 text-sm mt-1">
              {calculateAge(patient.birth_date)} anos
            </p>
          )}

          {/* Quick Action Buttons */}
          {patient.phone && (
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleCall}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-green-500 text-white rounded-xl font-medium active:bg-green-600"
              >
                <Phone className="w-5 h-5" />
                Ligar
              </button>
              <button
                onClick={handleWhatsApp}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-[#25D366] text-white rounded-xl font-medium active:bg-[#1da851]"
              >
                <MessageCircle className="w-5 h-5" />
                WhatsApp
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Contact Info */}
      <div className="px-4 py-4">
        <div className="card space-y-3">
          {patient.phone && (
            <a
              href={`tel:${patient.phone}`}
              className="flex items-center gap-3 p-2 rounded-xl active:bg-surface-50"
            >
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <Phone className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-surface-500">Telefone</p>
                <p className="text-surface-900 font-medium">{patient.phone}</p>
              </div>
            </a>
          )}

          {patient.email && (
            <a
              href={`mailto:${patient.email}`}
              className="flex items-center gap-3 p-2 rounded-xl active:bg-surface-50"
            >
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Mail className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-surface-500">Email</p>
                <p className="text-surface-900 font-medium">{patient.email}</p>
              </div>
            </a>
          )}

          {patient.birth_date && (
            <div className="flex items-center gap-3 p-2">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <Calendar className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-surface-500">Data de nascimento</p>
                <p className="text-surface-900 font-medium">
                  {format(parseISO(patient.birth_date), "d 'de' MMMM 'de' yyyy", {
                    locale: ptBR,
                  })}
                </p>
              </div>
            </div>
          )}

          {fullAddress && (
            <div className="flex items-center gap-3 p-2">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <MapPin className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-surface-500">Endereço</p>
                <p className="text-surface-900 font-medium">{fullAddress}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Notes */}
      {patient.notes && (
        <div className="px-4 pb-4">
          <h2 className="text-sm font-semibold text-surface-500 uppercase tracking-wider mb-2 px-1">
            Observações
          </h2>
          <div className="card">
            <p className="text-surface-700 whitespace-pre-wrap">{patient.notes}</p>
          </div>
        </div>
      )}

      {/* Clinical Info */}
      {patient.clinical_info && (
        <div className="px-4 pb-4">
          <h2 className="text-sm font-semibold text-surface-500 uppercase tracking-wider mb-2 px-1">
            Informações Clínicas
          </h2>
          <div className="card">
            <p className="text-surface-700 whitespace-pre-wrap">{patient.clinical_info}</p>
          </div>
        </div>
      )}

      {/* Recent Appointments */}
      <div className="px-4 pb-4">
        <h2 className="text-sm font-semibold text-surface-500 uppercase tracking-wider mb-2 px-1">
          Histórico recente
        </h2>
        {appointments.length === 0 ? (
          <div className="card text-center py-6">
            <FileText className="w-8 h-8 text-surface-300 mx-auto mb-2" />
            <p className="text-surface-500 text-sm">Nenhum agendamento</p>
          </div>
        ) : (
          <div className="card divide-y divide-surface-100">
            {appointments.map((appointment) => (
              <div key={appointment.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-surface-900">
                      {appointment.procedure || 'Consulta'}
                    </p>
                    <p className="text-sm text-surface-500">
                      {formatAppointmentDate(appointment.start)}{' '}
                      às {formatAppointmentTime(appointment.start)}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-full ${
                      appointment.status === 'completed' || appointment.status === 'done'
                        ? 'bg-green-100 text-green-700'
                        : appointment.status === 'cancelled'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-blue-100 text-blue-700'
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
