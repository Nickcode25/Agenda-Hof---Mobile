import { useState, useEffect, useMemo, useRef } from 'react'
import { Search, Plus, User, Upload } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Header } from '@/components/layout/Header'
import { Avatar } from '@/components/ui/Avatar'
import { Loading } from '@/components/ui/Loading'
import type { Patient } from '@/types/database'

// Alphabet for the sidebar index
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#'.split('')

export function PatientsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({})

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
      const firstChar = patient.name[0].toUpperCase()
      // If it's not a letter, group under #
      const letter = /[A-Z]/.test(firstChar) ? firstChar : '#'
      if (!groups[letter]) {
        groups[letter] = []
      }
      groups[letter].push(patient)
    })

    return Object.entries(groups).sort(([a], [b]) => {
      // # should always be at the end
      if (a === '#') return 1
      if (b === '#') return -1
      return a.localeCompare(b)
    })
  }, [filteredPatients])

  // Get available letters for the sidebar
  const availableLetters = useMemo(() => {
    return new Set(groupedPatients.map(([letter]) => letter))
  }, [groupedPatients])

  // Scroll to section when tapping on alphabet
  const scrollToLetter = (letter: string) => {
    const section = sectionRefs.current[letter]
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <div className="min-h-screen bg-white pb-20 flex flex-col">
      <Header
        title="Pacientes"
        rightAction={
          <div className="flex items-center -mr-2">
            <button
              onClick={() => navigate('/import-contacts')}
              className="w-9 h-9 flex items-center justify-center text-white active:opacity-60 transition-opacity"
              aria-label="Importar contatos"
            >
              <Upload className="w-5 h-5" strokeWidth={2} />
            </button>
            <button
              onClick={() => navigate('/patient/new')}
              className="w-9 h-9 flex items-center justify-center text-white active:opacity-60 transition-opacity"
              aria-label="Novo paciente"
            >
              <Plus className="w-6 h-6" strokeWidth={2} />
            </button>
          </div>
        }
      />

      {/* Search Bar */}
      <div className="bg-surface-50 px-4 py-2 border-b border-surface-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            placeholder="Buscar"
            className={`w-full bg-surface-100 rounded-lg py-2 pl-9 pr-4 text-[16px] text-surface-900 placeholder:text-surface-400 transition-all ${
              isSearchFocused ? 'ring-2 ring-primary-500/30 bg-white' : ''
            }`}
          />
        </div>
      </div>

      {/* Main Content with Alphabet Sidebar */}
      <div className="flex-1 flex relative overflow-hidden bg-surface-50">
        {/* Patient List */}
        <div
          ref={listRef}
          className="flex-1 overflow-y-auto"
        >
          {loading ? (
            <div className="pt-20">
              <Loading text="Carregando pacientes..." />
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="w-20 h-20 bg-surface-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="w-10 h-10 text-surface-400" />
              </div>
              <p className="text-surface-700 font-medium text-lg">
                {search ? 'Nenhum paciente encontrado' : 'Nenhum paciente cadastrado'}
              </p>
              <p className="text-surface-400 text-sm mt-1">
                {search ? 'Tente outra busca' : 'Toque no + para cadastrar'}
              </p>
            </div>
          ) : (
            <div className="pb-4">
              {groupedPatients.map(([letter, patientsInGroup]) => (
                <div
                  key={letter}
                  ref={(el) => { sectionRefs.current[letter] = el }}
                >
                  {/* Letter Section Header */}
                  <div className="sticky top-0 z-10 bg-surface-50 px-5 py-0.5">
                    <span className="text-[13px] font-semibold text-surface-500">
                      {letter}
                    </span>
                  </div>

                  {/* Patient Items */}
                  <div className="bg-white">
                    {patientsInGroup.map((patient, index) => (
                      <button
                        key={patient.id}
                        onClick={() => navigate(`/patient/${patient.id}`)}
                        className="w-full flex items-center px-5 py-2.5 active:bg-surface-50 transition-colors relative"
                      >
                        <Avatar
                          name={patient.name}
                          src={patient.photo_url || undefined}
                          size="md"
                        />
                        <span className="flex-1 ml-3 text-left font-normal text-[17px] text-surface-900 truncate">
                          {patient.name}
                        </span>
                        {/* iOS Chevron */}
                        <svg
                          className="w-4 h-4 text-surface-300 ml-2 flex-shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2.5}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                        {/* iOS-style separator line (starts after avatar, not on last item) */}
                        {index < patientsInGroup.length - 1 && (
                          <div className="absolute left-[68px] right-0 bottom-0 h-[0.5px] bg-surface-200" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Alphabet Sidebar - iOS Style */}
        {!loading && filteredPatients.length > 0 && !search && (
          <div className="absolute right-0.5 top-0 bottom-0 flex flex-col justify-center py-2 z-20">
            <div className="flex flex-col items-center">
              {ALPHABET.map((letter) => {
                const isAvailable = availableLetters.has(letter)
                return (
                  <button
                    key={letter}
                    onClick={() => isAvailable && scrollToLetter(letter)}
                    className={`w-4 h-[14px] flex items-center justify-center text-[10px] font-semibold transition-opacity ${
                      isAvailable
                        ? 'text-info active:opacity-50'
                        : 'text-surface-300'
                    }`}
                    disabled={!isAvailable}
                  >
                    {letter}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
