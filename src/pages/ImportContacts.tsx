import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Check, Users, AlertCircle, Loader2, Smartphone, CheckCircle2, Phone, Mail } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Loading } from '@/components/ui/Loading'
import { Avatar } from '@/components/ui/Avatar'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import {
  ContactInfo,
  getDeviceContacts,
  requestContactsPermission,
  isNativePlatform,
  formatPhoneNumber,
} from '@/lib/contacts'
import type { Patient } from '@/types/database'

type ImportStatus = 'idle' | 'loading' | 'permission_denied' | 'success' | 'error' | 'web_platform'

export function ImportContactsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [status, setStatus] = useState<ImportStatus>('idle')
  const [contacts, setContacts] = useState<ContactInfo[]>([])
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set())
  const [existingPatients, setExistingPatients] = useState<Patient[]>([])
  const [search, setSearch] = useState('')
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 })
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    loadExistingPatients()
  }, [user])

  // Carrega pacientes existentes para verificar duplicatas
  const loadExistingPatients = async () => {
    if (!user) return

    const { data } = await supabase
      .from('patients')
      .select('*')
      .eq('user_id', user.id)

    if (data) {
      setExistingPatients(data)
    }
  }

  // Solicita acesso aos contatos
  const handleRequestAccess = async () => {
    if (!isNativePlatform()) {
      setStatus('web_platform')
      return
    }

    setStatus('loading')

    try {
      const hasPermission = await requestContactsPermission()

      if (!hasPermission) {
        setStatus('permission_denied')
        return
      }

      const deviceContacts = await getDeviceContacts()
      setContacts(deviceContacts)
      setStatus('success')
    } catch (error) {
      console.error('Error loading contacts:', error)
      setErrorMessage('Erro ao carregar contatos. Tente novamente.')
      setStatus('error')
    }
  }

  // Normaliza string para comparação
  const normalizeString = (str: string) => {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
  }

  // Normaliza telefone para comparação
  const normalizePhone = (phone: string) => {
    return phone.replace(/\D/g, '').slice(-9) // Últimos 9 dígitos
  }

  // Verifica se contato já existe como paciente
  const isContactAlreadyPatient = (contact: ContactInfo): boolean => {
    const contactNameNormalized = normalizeString(contact.name)
    const contactPhone = contact.phone ? normalizePhone(contact.phone) : ''
    const contactEmail = contact.email ? normalizeString(contact.email) : ''

    return existingPatients.some((patient) => {
      const patientNameNormalized = normalizeString(patient.name)
      const patientPhone = patient.phone ? normalizePhone(patient.phone) : ''
      const patientEmail = patient.email ? normalizeString(patient.email) : ''

      // Verifica por nome similar
      if (contactNameNormalized === patientNameNormalized) return true

      // Verifica por telefone
      if (contactPhone && patientPhone && contactPhone === patientPhone) return true

      // Verifica por email
      if (contactEmail && patientEmail && contactEmail === patientEmail) return true

      return false
    })
  }

  // Filtra contatos pela busca
  const filteredContacts = useMemo(() => {
    if (!search.trim()) return contacts

    const searchNormalized = normalizeString(search)
    return contacts.filter(
      (contact) =>
        normalizeString(contact.name).includes(searchNormalized) ||
        contact.phone?.includes(search) ||
        normalizeString(contact.email || '').includes(searchNormalized)
    )
  }, [contacts, search])

  // Contatos novos (não existentes como pacientes)
  const newContacts = useMemo(() => {
    return filteredContacts.filter((contact) => !isContactAlreadyPatient(contact))
  }, [filteredContacts, existingPatients])

  // Contatos já cadastrados
  const existingContacts = useMemo(() => {
    return filteredContacts.filter((contact) => isContactAlreadyPatient(contact))
  }, [filteredContacts, existingPatients])

  // Toggle seleção de contato
  const toggleContact = (contactId: string) => {
    const newSelected = new Set(selectedContacts)
    if (newSelected.has(contactId)) {
      newSelected.delete(contactId)
    } else {
      newSelected.add(contactId)
    }
    setSelectedContacts(newSelected)
  }

  // Seleciona todos os contatos novos
  const selectAllNew = () => {
    const newSelected = new Set<string>()
    newContacts.forEach((contact) => newSelected.add(contact.id))
    setSelectedContacts(newSelected)
  }

  // Desmarca todos
  const deselectAll = () => {
    setSelectedContacts(new Set())
  }

  // Importa contatos selecionados
  const handleImport = async () => {
    if (selectedContacts.size === 0 || !user) return

    setImporting(true)
    setImportProgress({ current: 0, total: selectedContacts.size })

    const contactsToImport = contacts.filter((c) => selectedContacts.has(c.id))
    let imported = 0

    for (const contact of contactsToImport) {
      try {
        await supabase.from('patients').insert({
          user_id: user.id,
          name: contact.name,
          phone: contact.phone ? formatPhoneNumber(contact.phone) : null,
          email: contact.email || null,
          is_active: true,
        })
        imported++
        setImportProgress({ current: imported, total: selectedContacts.size })
      } catch (error) {
        console.error('Error importing contact:', contact.name, error)
      }
    }

    setImporting(false)

    // Redireciona para lista de pacientes
    navigate('/patients', { replace: true })
  }

  // Tela inicial - solicitar acesso
  if (status === 'idle') {
    return (
      <div className="min-h-screen bg-surface-50 pb-20">
        <Header title="Importar Contatos" showBack />

        <div className="flex flex-col items-center justify-center px-6 pt-20">
          <div className="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center mb-6">
            <Smartphone className="w-12 h-12 text-primary-500" />
          </div>

          <h2 className="text-xl font-semibold text-surface-900 text-center mb-2">
            Sincronizar Contatos
          </h2>

          <p className="text-surface-600 text-center mb-8 max-w-xs">
            Importe contatos do seu iPhone para adicionar rapidamente como pacientes.
          </p>

          <button
            onClick={handleRequestAccess}
            className="btn-primary w-full max-w-xs flex items-center justify-center gap-2"
          >
            <Users className="w-5 h-5" />
            Acessar Contatos
          </button>

          <p className="text-xs text-surface-400 text-center mt-4 max-w-xs">
            O app solicitará permissão para acessar sua agenda de contatos.
          </p>
        </div>
      </div>
    )
  }

  // Carregando contatos
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-surface-50 pb-20">
        <Header title="Importar Contatos" showBack />
        <Loading fullScreen text="Carregando contatos..." />
      </div>
    )
  }

  // Permissão negada
  if (status === 'permission_denied') {
    return (
      <div className="min-h-screen bg-surface-50 pb-20">
        <Header title="Importar Contatos" showBack />

        <div className="flex flex-col items-center justify-center px-6 pt-20">
          <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mb-6">
            <AlertCircle className="w-12 h-12 text-red-500" />
          </div>

          <h2 className="text-xl font-semibold text-surface-900 text-center mb-2">
            Permissão Necessária
          </h2>

          <p className="text-surface-600 text-center mb-8 max-w-xs">
            Para importar contatos, você precisa permitir o acesso nas configurações do iPhone.
          </p>

          <div className="bg-surface-100 rounded-xl p-4 w-full max-w-xs">
            <p className="text-sm text-surface-700">
              <strong>Como permitir:</strong>
            </p>
            <ol className="text-sm text-surface-600 mt-2 space-y-1 list-decimal list-inside">
              <li>Abra Ajustes do iPhone</li>
              <li>Toque em Privacidade</li>
              <li>Toque em Contatos</li>
              <li>Ative a permissão para Agenda HOF</li>
            </ol>
          </div>

          <button
            onClick={() => setStatus('idle')}
            className="btn-primary w-full max-w-xs mt-6"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    )
  }

  // Plataforma web (não suportado)
  if (status === 'web_platform') {
    return (
      <div className="min-h-screen bg-surface-50 pb-20">
        <Header title="Importar Contatos" showBack />

        <div className="flex flex-col items-center justify-center px-6 pt-20">
          <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mb-6">
            <Smartphone className="w-12 h-12 text-blue-500" />
          </div>

          <h2 className="text-xl font-semibold text-surface-900 text-center mb-2">
            Disponível no App
          </h2>

          <p className="text-surface-600 text-center mb-8 max-w-xs">
            A importação de contatos está disponível apenas no aplicativo instalado no iPhone.
          </p>

          <button
            onClick={() => navigate(-1)}
            className="btn-secondary w-full max-w-xs"
          >
            Voltar
          </button>
        </div>
      </div>
    )
  }

  // Erro
  if (status === 'error') {
    return (
      <div className="min-h-screen bg-surface-50 pb-20">
        <Header title="Importar Contatos" showBack />

        <div className="flex flex-col items-center justify-center px-6 pt-20">
          <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mb-6">
            <AlertCircle className="w-12 h-12 text-red-500" />
          </div>

          <h2 className="text-xl font-semibold text-surface-900 text-center mb-2">
            Erro ao Carregar
          </h2>

          <p className="text-surface-600 text-center mb-8 max-w-xs">
            {errorMessage}
          </p>

          <button
            onClick={handleRequestAccess}
            className="btn-primary w-full max-w-xs"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    )
  }

  // Lista de contatos para importar
  return (
    <div className="min-h-screen bg-surface-50 pb-32">
      <Header title="Importar Contatos" showBack />

      {/* Search */}
      <div className="bg-white border-b border-surface-200 px-4 py-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar contato..."
            className="input pl-10"
          />
        </div>
      </div>

      {/* Stats & Actions */}
      <div className="bg-white border-b border-surface-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="text-sm text-surface-600">
            <span className="font-medium text-surface-900">{newContacts.length}</span> novos contatos
            {existingContacts.length > 0 && (
              <span className="ml-2 text-surface-400">
                ({existingContacts.length} já cadastrados)
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {selectedContacts.size > 0 ? (
              <button
                onClick={deselectAll}
                className="text-sm text-primary-600 font-medium"
              >
                Limpar
              </button>
            ) : (
              <button
                onClick={selectAllNew}
                className="text-sm text-primary-600 font-medium"
              >
                Selecionar todos
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Contacts List */}
      <div className="px-4 py-3">
        {newContacts.length === 0 && existingContacts.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-surface-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-10 h-10 text-surface-400" />
            </div>
            <p className="text-surface-600 font-medium">Nenhum contato encontrado</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Novos contatos */}
            {newContacts.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold text-primary-500 uppercase tracking-wider px-1 mb-2">
                  Novos Contatos ({newContacts.length})
                </h2>
                <div className="bg-white rounded-2xl overflow-hidden divide-y divide-surface-100">
                  {newContacts.map((contact) => (
                    <button
                      key={contact.id}
                      onClick={() => toggleContact(contact.id)}
                      className="w-full flex items-center gap-3 p-3 active:bg-surface-50 transition-colors"
                    >
                      <div
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                          selectedContacts.has(contact.id)
                            ? 'bg-primary-500 border-primary-500'
                            : 'border-surface-300'
                        }`}
                      >
                        {selectedContacts.has(contact.id) && (
                          <Check className="w-4 h-4 text-white" />
                        )}
                      </div>
                      <Avatar name={contact.name} size="md" />
                      <div className="flex-1 min-w-0 text-left">
                        <h3 className="font-medium text-surface-900 truncate">
                          {contact.name}
                        </h3>
                        <div className="flex items-center gap-3 text-sm text-surface-500">
                          {contact.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {contact.phone}
                            </span>
                          )}
                          {contact.email && (
                            <span className="flex items-center gap-1 truncate">
                              <Mail className="w-3 h-3" />
                              {contact.email}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Contatos já cadastrados */}
            {existingContacts.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold text-surface-400 uppercase tracking-wider px-1 mb-2">
                  Já Cadastrados ({existingContacts.length})
                </h2>
                <div className="bg-white rounded-2xl overflow-hidden divide-y divide-surface-100 opacity-60">
                  {existingContacts.map((contact) => (
                    <div
                      key={contact.id}
                      className="w-full flex items-center gap-3 p-3"
                    >
                      <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      </div>
                      <Avatar name={contact.name} size="md" />
                      <div className="flex-1 min-w-0 text-left">
                        <h3 className="font-medium text-surface-700 truncate">
                          {contact.name}
                        </h3>
                        {contact.phone && (
                          <p className="text-sm text-surface-400 flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {contact.phone}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Fixed Import Button */}
      {selectedContacts.size > 0 && (
        <div className="fixed bottom-20 left-0 right-0 bg-white border-t border-surface-200 px-4 py-3 safe-area-bottom">
          <button
            onClick={handleImport}
            disabled={importing}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {importing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Importando {importProgress.current}/{importProgress.total}...
              </>
            ) : (
              <>
                <Users className="w-5 h-5" />
                Importar {selectedContacts.size} contato{selectedContacts.size > 1 ? 's' : ''}
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
