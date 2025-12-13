import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Header } from '@/components/layout/Header'

export function NewPatientPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Campos do formulário
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [cpf, setCpf] = useState('')
  const [birthDate, setBirthDate] = useState('')

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

  // Formatação de data de nascimento DD/MM/AAAA
  const formatBirthDate = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    if (numbers.length <= 2) return numbers
    if (numbers.length <= 4) return `${numbers.slice(0, 2)}/${numbers.slice(2)}`
    return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)}`
  }

  // Converter DD/MM/AAAA para AAAA-MM-DD (formato do banco)
  const convertToISODate = (dateStr: string): string | null => {
    const parts = dateStr.split('/')
    if (parts.length === 3 && parts[2].length === 4) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`
    }
    return null
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('Nome é obrigatório')
      return
    }

    setLoading(true)

    try {
      const { data, error: insertError } = await supabase
        .from('patients')
        .insert({
          user_id: user!.id,
          name: name.trim(),
          phone: phone || null,
          cpf: cpf || null,
          birth_date: convertToISODate(birthDate) || null,
          is_active: true,
          planned_procedures: '[]',
        })
        .select()
        .single()

      if (insertError) throw insertError

      // Navegar para os detalhes do paciente criado
      navigate(`/patient/${data.id}`, { replace: true })
    } catch (err: any) {
      console.error('Erro ao criar paciente:', err)
      setError(err.message || 'Erro ao criar paciente')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface-50 pb-20">
      <Header title="Novo Paciente" showBack />

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
            type="text"
            inputMode="numeric"
            value={birthDate}
            onChange={(e) => setBirthDate(formatBirthDate(e.target.value))}
            className="input"
            placeholder="DD/MM/AAAA"
            maxLength={10}
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
                Salvando...
              </>
            ) : (
              'Salvar Paciente'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
