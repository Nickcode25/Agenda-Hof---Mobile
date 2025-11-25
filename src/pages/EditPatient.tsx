import { useState, useEffect, FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Loader2, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Header } from '@/components/layout/Header'
import { Loading } from '@/components/ui/Loading'
import type { Patient } from '@/types/database'

export function EditPatientPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [error, setError] = useState('')

  // Campos do formulário
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [cpf, setCpf] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [notes, setNotes] = useState('')
  const [clinicalInfo, setClinicalInfo] = useState('')

  useEffect(() => {
    if (id) {
      fetchPatient()
    }
  }, [id])

  const fetchPatient = async () => {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('id', id!)
      .single()

    if (error) {
      setError('Paciente não encontrado')
      setLoading(false)
      return
    }

    const patient = data as Patient
    setName(patient.name || '')
    setPhone(patient.phone || '')
    setEmail(patient.email || '')
    setCpf(patient.cpf || '')
    setBirthDate(patient.birth_date || '')
    setNotes(patient.notes || '')
    setClinicalInfo(patient.clinical_info || '')
    setLoading(false)
  }

  // Formatação de telefone
  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    if (numbers.length <= 2) return `(${numbers}`
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`
  }

  // Formatação de CPF
  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    if (numbers.length <= 3) return numbers
    if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`
    if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('Nome é obrigatório')
      return
    }

    setSaving(true)

    try {
      const { error: updateError } = await supabase
        .from('patients')
        .update({
          name: name.trim(),
          phone: phone || null,
          email: email || null,
          cpf: cpf || null,
          birth_date: birthDate || null,
          notes: notes || null,
          clinical_info: clinicalInfo || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id!)

      if (updateError) throw updateError

      // Voltar para os detalhes do paciente
      navigate(`/patient/${id}`, { replace: true })
    } catch (err: any) {
      console.error('Erro ao atualizar paciente:', err)
      setError(err.message || 'Erro ao atualizar paciente')
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const { error: deleteError } = await supabase
        .from('patients')
        .delete()
        .eq('id', id!)

      if (deleteError) throw deleteError

      // Voltar para a lista de pacientes
      navigate('/patients', { replace: true })
    } catch (err: any) {
      console.error('Erro ao excluir paciente:', err)
      setError(err.message || 'Erro ao excluir paciente')
      setDeleting(false)
      setShowDeleteModal(false)
    }
  }

  if (loading) {
    return <Loading fullScreen text="Carregando paciente..." />
  }

  return (
    <div className="min-h-screen bg-surface-50 pb-20">
      <Header title="Editar Paciente" showBack />

      <form onSubmit={handleSubmit} className="px-4 py-4 space-y-4">
        {/* Nome */}
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1.5">
            Nome completo *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
            placeholder="Nome do paciente"
            autoComplete="name"
            required
          />
        </div>

        {/* Telefone */}
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1.5">
            Telefone
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(formatPhone(e.target.value))}
            className="input"
            placeholder="(00) 00000-0000"
            autoComplete="tel"
            maxLength={15}
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1.5">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
            placeholder="email@exemplo.com"
            autoComplete="email"
          />
        </div>

        {/* CPF */}
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1.5">
            CPF
          </label>
          <input
            type="text"
            value={cpf}
            onChange={(e) => setCpf(formatCPF(e.target.value))}
            className="input"
            placeholder="000.000.000-00"
            maxLength={14}
          />
        </div>

        {/* Data de Nascimento */}
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1.5">
            Data de nascimento
          </label>
          <input
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            className="input"
          />
        </div>

        {/* Observações */}
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1.5">
            Observações
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="input min-h-[100px] resize-none"
            placeholder="Observações sobre o paciente..."
            rows={4}
          />
        </div>

        {/* Informações Clínicas */}
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1.5">
            Informações Clínicas
          </label>
          <textarea
            value={clinicalInfo}
            onChange={(e) => setClinicalInfo(e.target.value)}
            className="input min-h-[100px] resize-none"
            placeholder="Informações clínicas relevantes..."
            rows={4}
          />
        </div>

        {error && (
          <p className="text-red-600 text-sm text-center">{error}</p>
        )}

        {/* Botão Salvar */}
        <div className="pt-4 space-y-3">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar Alterações'
            )}
          </button>

          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-red-200 text-red-600 font-medium active:bg-red-50"
          >
            <Trash2 className="w-5 h-5" />
            Excluir Paciente
          </button>
        </div>
      </form>

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowDeleteModal(false)}
          />

          {/* Modal */}
          <div className="relative bg-white rounded-2xl w-full max-w-sm shadow-xl">
            <div className="p-6 text-center">
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-7 h-7 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-surface-900 mb-2">
                Excluir paciente?
              </h3>
              <p className="text-surface-500 text-sm">
                Esta ação não pode ser desfeita. Todos os dados do paciente serão removidos permanentemente.
              </p>
            </div>

            <div className="flex border-t border-surface-100">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-4 text-surface-600 font-medium border-r border-surface-100 active:bg-surface-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-4 text-red-600 font-medium active:bg-red-50 disabled:opacity-50"
              >
                {deleting ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
