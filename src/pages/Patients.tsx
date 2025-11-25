import { useState, useEffect, useMemo } from 'react'
import { Search, Plus, User, Phone, Upload } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Header } from '@/components/layout/Header'
import { Avatar } from '@/components/ui/Avatar'
import { Loading } from '@/components/ui/Loading'
import { TrialBanner } from '@/components/TrialBanner'
import type { Patient } from '@/types/database'

export function PatientsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (user) {
      fetchPatients()
    }
  }, [user])

  const fetchPatients = async () => {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('user_id', user!.id)
      .order('name', { ascending: true })

    if (!error && data) {
      setPatients(data)
    }
    setLoading(false)
  }

  // Remove acentos de uma string
  const normalizeString = (str: string) => {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  }

  const filteredPatients = useMemo(() => {
    if (!search.trim()) return patients

    const searchNormalized = normalizeString(search)
    return patients.filter(
      (patient) =>
        normalizeString(patient.name).includes(searchNormalized) ||
        patient.phone?.includes(search) ||
        normalizeString(patient.email || '').includes(searchNormalized)
    )
  }, [patients, search])

  // Agrupa pacientes por letra inicial
  const groupedPatients = useMemo(() => {
    const groups: Record<string, Patient[]> = {}
    
    filteredPatients.forEach((patient) => {
      const letter = patient.name[0].toUpperCase()
      if (!groups[letter]) {
        groups[letter] = []
      }
      groups[letter].push(patient)
    })

    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
  }, [filteredPatients])

  return (
    <div className="min-h-screen bg-surface-50 pb-20">
      <Header
        title="Pacientes"
        rightAction={
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigate('/import-contacts')}
              className="p-2 rounded-full active:bg-orange-600"
              title="Importar contatos"
            >
              <Upload className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={() => navigate('/patient/new')}
              className="p-2 rounded-full active:bg-orange-600"
              title="Novo paciente"
            >
              <Plus className="w-6 h-6 text-white" />
            </button>
          </div>
        }
      />

      {/* Trial Banner */}
      <TrialBanner />

      {/* Search */}
      <div className="bg-white border-b border-surface-200 px-4 py-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar paciente..."
            className="input pl-10"
          />
        </div>
      </div>

      {/* Patients List */}
      <div className="px-4 py-3">
        {loading ? (
          <Loading text="Carregando pacientes..." />
        ) : filteredPatients.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-10 h-10 text-orange-500" />
            </div>
            <p className="text-surface-600 font-medium">
              {search ? 'Nenhum paciente encontrado' : 'Nenhum paciente cadastrado'}
            </p>
            <p className="text-surface-400 text-sm mt-1">Toque no + para cadastrar</p>
          </div>
        ) : (
          <div className="space-y-4">
            {groupedPatients.map(([letter, patientsInGroup]) => (
              <div key={letter}>
                <h2 className="text-xs font-semibold text-orange-500 uppercase tracking-wider px-1 mb-2">
                  {letter}
                </h2>
                <div className="bg-white rounded-2xl overflow-hidden divide-y divide-surface-100">
                  {patientsInGroup.map((patient) => (
                    <button
                      key={patient.id}
                      onClick={() => navigate(`/patient/${patient.id}`)}
                      className="w-full flex items-center gap-3 p-3 active:bg-surface-50 transition-colors"
                    >
                      <Avatar
                        name={patient.name}
                        src={patient.photo_url || undefined}
                        size="md"
                      />
                      <div className="flex-1 min-w-0 text-left">
                        <h3 className="font-medium text-surface-900 truncate">
                          {patient.name}
                        </h3>
                        {patient.phone && (
                          <p className="text-sm text-surface-500 flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {patient.phone}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
