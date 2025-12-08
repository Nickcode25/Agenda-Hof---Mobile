import { useState, useEffect, useMemo } from 'react'
import { Search, Plus, User, Phone, Upload } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Avatar } from '@/components/ui/Avatar'
import { Loading } from '@/components/ui/Loading'
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
      {/* Header compacto */}
      <div className="bg-primary-500 text-white px-4 py-2.5 flex items-center justify-between safe-area-top">
        <h1 className="text-lg font-semibold">Pacientes</h1>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => navigate('/import-contacts')}
            className="p-2 rounded-full active:bg-white/20 transition-colors"
            aria-label="Importar contatos"
          >
            <Upload className="w-5 h-5" />
          </button>
          <button
            onClick={() => navigate('/patient/new')}
            className="p-2 rounded-full active:bg-white/20 transition-colors"
            aria-label="Novo paciente"
          >
            <Plus className="w-6 h-6" strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Barra de busca estilo iOS */}
      <div className="bg-white px-4 py-2.5 border-b border-surface-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar paciente..."
            className="w-full bg-surface-100 rounded-xl py-2 pl-9 pr-4 text-sm text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:bg-white transition-colors"
          />
        </div>
      </div>

      {/* Lista de pacientes */}
      <div className="px-4 pt-3">
        {loading ? (
          <Loading text="Carregando pacientes..." />
        ) : filteredPatients.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <User className="w-8 h-8 text-primary-500" />
            </div>
            <p className="text-surface-700 font-medium">
              {search ? 'Nenhum paciente encontrado' : 'Nenhum paciente cadastrado'}
            </p>
            <p className="text-surface-400 text-sm mt-1">
              {search ? 'Tente outra busca' : 'Toque no + para cadastrar'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {groupedPatients.map(([letter, patientsInGroup]) => (
              <div key={letter}>
                {/* Letra separadora */}
                <h2 className="text-xs font-bold text-surface-400 uppercase tracking-wider px-1 mb-1.5 sticky top-0 bg-surface-50 py-1 -mx-4 px-5">
                  {letter}
                </h2>
                {/* Cards dos pacientes */}
                <div className="bg-white rounded-xl overflow-hidden shadow-sm">
                  {patientsInGroup.map((patient, index) => (
                    <button
                      key={patient.id}
                      onClick={() => navigate(`/patient/${patient.id}`)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 active:bg-surface-50 transition-colors ${
                        index < patientsInGroup.length - 1 ? 'border-b border-surface-100' : ''
                      }`}
                    >
                      <Avatar
                        name={patient.name}
                        src={patient.photo_url || undefined}
                        size="md"
                      />
                      <div className="flex-1 min-w-0 text-left">
                        <h3 className="font-medium text-surface-900 truncate text-[15px]">
                          {patient.name}
                        </h3>
                        {patient.phone && (
                          <p className="text-xs text-surface-400 flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3" />
                            {patient.phone}
                          </p>
                        )}
                      </div>
                      {/* Chevron sutil */}
                      <svg className="w-4 h-4 text-surface-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
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
