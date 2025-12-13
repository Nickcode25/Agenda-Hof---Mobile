import { useState, useEffect, useMemo, useRef } from 'react'
import { Search, Plus, User, Upload } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useVirtualizer } from '@tanstack/react-virtual'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Avatar } from '@/components/ui/Avatar'
import { Loading } from '@/components/ui/Loading'
import type { Patient } from '@/types/database'

// Alphabet for the sidebar index
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#'.split('')

// Virtual list item types
type VirtualListItem =
  | { type: 'header'; letter: string; key: string }
  | { type: 'patient'; patient: Patient; isLast: boolean; key: string }

export function PatientsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

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

  // Flatten list for virtualization (header + patients)
  const virtualItems = useMemo((): VirtualListItem[] => {
    const items: VirtualListItem[] = []

    groupedPatients.forEach(([letter, patientsInGroup]) => {
      // Add header
      items.push({
        type: 'header',
        letter,
        key: `header-${letter}`,
      })

      // Add patients in group
      patientsInGroup.forEach((patient, index) => {
        items.push({
          type: 'patient',
          patient,
          isLast: index === patientsInGroup.length - 1,
          key: `patient-${patient.id}`,
        })
      })
    })

    return items
  }, [groupedPatients])

  // Get available letters for the sidebar
  const availableLetters = useMemo(() => {
    return new Set(groupedPatients.map(([letter]) => letter))
  }, [groupedPatients])

  // Setup virtual scrolling
  const rowVirtualizer = useVirtualizer({
    count: virtualItems.length,
    getScrollElement: () => listRef.current,
    estimateSize: (index) => {
      const item = virtualItems[index]
      // Headers: 24px, Patients: 52px
      return item?.type === 'header' ? 24 : 52
    },
    overscan: 5, // Render 5 extra items above/below viewport
  })

  // Scroll to letter for alphabet sidebar
  const scrollToLetter = (letter: string) => {
    const index = virtualItems.findIndex(
      (item) => item.type === 'header' && item.letter === letter
    )
    if (index !== -1) {
      rowVirtualizer.scrollToIndex(index, { align: 'start' })
    }
  }

  return (
    <div className="min-h-screen bg-[#f2f2f7] pb-20 flex flex-col">
      {/* Safe area top com cor de fundo */}
      <div className="h-safe-top bg-[#f2f2f7]" />
      {/* iOS Large Title Header */}
      <div className="bg-[#f2f2f7]">
        <div className="flex items-center justify-between px-4 pt-2 pb-1">
          <h1 className="text-[34px] font-bold text-surface-900 tracking-tight">
            Pacientes
          </h1>
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigate('/import-contacts')}
              className="w-10 h-10 flex items-center justify-center text-primary-500 active:opacity-60 transition-opacity rounded-full"
              aria-label="Importar contatos"
            >
              <Upload className="w-[22px] h-[22px]" strokeWidth={2} />
            </button>
            <button
              onClick={() => navigate('/patient/new')}
              className="w-10 h-10 flex items-center justify-center text-primary-500 active:opacity-60 transition-opacity rounded-full"
              aria-label="Novo paciente"
            >
              <Plus className="w-7 h-7" strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>

      {/* iOS Search Bar */}
      <div className="bg-[#f2f2f7] px-4 py-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-[15px] h-[15px] text-[#8e8e93]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            placeholder="Buscar"
            className={`w-full bg-[#e5e5ea] rounded-[10px] py-[7px] pl-8 pr-4 text-[17px] text-surface-900 placeholder:text-[#8e8e93] transition-all ${
              isSearchFocused ? 'bg-white ring-1 ring-[#c7c7cc]' : ''
            }`}
          />
        </div>
      </div>

      {/* Main Content with Alphabet Sidebar */}
      <div className="flex-1 flex relative overflow-hidden bg-[#f2f2f7]">
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
              <div className="w-20 h-20 bg-[#e5e5ea] rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="w-10 h-10 text-[#8e8e93]" />
              </div>
              <p className="text-surface-900 font-semibold text-[17px]">
                {search ? 'Nenhum paciente encontrado' : 'Nenhum paciente cadastrado'}
              </p>
              <p className="text-[#8e8e93] text-[15px] mt-1">
                {search ? 'Tente outra busca' : 'Toque no + para cadastrar'}
              </p>
            </div>
          ) : (
            <div
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const item = virtualItems[virtualRow.index]
                if (!item) return null

                return (
                  <div
                    key={item.key}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    {item.type === 'header' ? (
                      <div className="sticky top-0 z-10 bg-[#f2f2f7] px-5 py-1">
                        <span className="text-[13px] font-semibold text-[#8e8e93]">
                          {item.letter}
                        </span>
                      </div>
                    ) : (
                      <div className="bg-white mx-4 first:rounded-t-xl last:rounded-b-xl">
                        <button
                          onClick={() => navigate(`/patient/${item.patient.id}`)}
                          className="w-full flex items-center px-4 py-2.5 active:bg-[#f2f2f7] transition-colors relative"
                        >
                          <Avatar
                            name={item.patient.name}
                            src={item.patient.photo_url || undefined}
                            size="md"
                          />
                          <span className="flex-1 ml-3 text-left font-normal text-[17px] text-surface-900 truncate">
                            {item.patient.name}
                          </span>
                          {/* iOS Chevron */}
                          <svg
                            className="w-[14px] h-[14px] text-[#c7c7cc] ml-2 flex-shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                          {/* iOS-style separator line (not on last item in group) */}
                          {!item.isLast && (
                            <div className="absolute left-[60px] right-0 bottom-0 h-[0.5px] bg-[#c7c7cc]/50" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Alphabet Sidebar - iOS Style */}
        {!loading && filteredPatients.length > 0 && !search && (
          <div className="absolute right-0 top-0 bottom-0 flex flex-col justify-center py-2 z-20 pr-0.5">
            <div className="flex flex-col items-center">
              {ALPHABET.map((letter) => {
                const isAvailable = availableLetters.has(letter)
                return (
                  <button
                    key={letter}
                    onClick={() => isAvailable && scrollToLetter(letter)}
                    className={`w-[18px] h-[13px] flex items-center justify-center text-[11px] font-semibold transition-opacity ${
                      isAvailable
                        ? 'text-primary-500 active:scale-150'
                        : 'text-[#c7c7cc]'
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
