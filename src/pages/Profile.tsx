import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Header } from '@/components/layout/Header'
import { Loading } from '@/components/ui/Loading'
import { Camera, User, MapPin, Phone, Check } from 'lucide-react'

interface ProfileData {
  // Informações Pessoais
  avatar_url: string
  full_name: string
  username: string
  email: string
  // Endereço
  country: string
  cep: string
  state: string
  city: string
  neighborhood: string
  street: string
  number: string
  complement: string
  // Telefone
  country_code: string
  area_code: string
  phone_number: string
}

const initialProfileData: ProfileData = {
  avatar_url: '',
  full_name: '',
  username: '',
  email: '',
  country: 'Brasil',
  cep: '',
  state: '',
  city: '',
  neighborhood: '',
  street: '',
  number: '',
  complement: '',
  country_code: '+55',
  area_code: '',
  phone_number: '',
}

export function ProfilePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [profile, setProfile] = useState<ProfileData>(initialProfileData)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadingCep, setLoadingCep] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // Carrega dados do perfil
  useEffect(() => {
    loadProfileData()
  }, [user])

  const loadProfileData = async () => {
    if (!user) return

    try {
      setLoading(true)

      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (data && !error) {
        setProfile({
          avatar_url: data.avatar_url || '',
          full_name: data.full_name || user.user_metadata?.full_name || '',
          username: data.username || '',
          email: user.email || '',
          country: data.country || 'Brasil',
          cep: data.cep || '',
          state: data.state || '',
          city: data.city || '',
          neighborhood: data.neighborhood || '',
          street: data.street || '',
          number: data.number || '',
          complement: data.complement || '',
          country_code: data.country_code || '+55',
          area_code: data.area_code || '',
          phone_number: data.phone_number || '',
        })
      } else {
        // Se não existe perfil ou houve erro, preenche com dados básicos do usuário
        if (error) {
          console.error('Erro ao carregar perfil:', error)
        }
        setProfile({
          ...initialProfileData,
          email: user.email || '',
          full_name: user.user_metadata?.full_name || '',
        })
      }
    } catch (err) {
      console.error('Erro ao carregar perfil:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof ProfileData, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }))

    // Busca automática de CEP
    if (field === 'cep') {
      const cleanCep = value.replace(/\D/g, '')
      if (cleanCep.length === 8) {
        fetchAddressByCep(cleanCep)
      }
    }
  }

  const fetchAddressByCep = async (cep: string) => {
    setLoadingCep(true)
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
      const data = await response.json()

      if (!data.erro) {
        setProfile(prev => ({
          ...prev,
          street: data.logradouro || '',
          neighborhood: data.bairro || '',
          city: data.localidade || '',
          state: data.uf || '',
        }))
      }
    } catch (err) {
      console.error('Erro ao buscar CEP:', err)
    } finally {
      setLoadingCep(false)
    }
  }

  const handlePhotoClick = () => {
    fileInputRef.current?.click()
  }

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Converte para base64
    const reader = new FileReader()
    reader.onload = (event) => {
      const base64 = event.target?.result as string
      setProfile(prev => ({ ...prev, avatar_url: base64 }))
    }
    reader.readAsDataURL(file)
  }

  const handleSave = async () => {
    if (!user) return

    setSaving(true)
    setMessage(null)

    try {
      const updateData = {
        user_id: user.id,
        avatar_url: profile.avatar_url,
        full_name: profile.full_name,
        username: profile.username,
        country: profile.country,
        cep: profile.cep,
        state: profile.state,
        city: profile.city,
        neighborhood: profile.neighborhood,
        street: profile.street,
        number: profile.number,
        complement: profile.complement,
        country_code: profile.country_code,
        area_code: profile.area_code,
        phone_number: profile.phone_number,
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase
        .from('user_profiles')
        .upsert(updateData, { onConflict: 'user_id' })

      if (error) throw error

      setMessage({ type: 'success', text: 'Perfil atualizado com sucesso!' })

      // Limpa mensagem após 3 segundos
      setTimeout(() => setMessage(null), 3000)
    } catch (err) {
      console.error('Erro ao salvar perfil:', err)
      setMessage({ type: 'error', text: 'Erro ao salvar perfil. Tente novamente.' })
    } finally {
      setSaving(false)
    }
  }

  const formatCep = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    if (numbers.length <= 5) return numbers
    return `${numbers.slice(0, 5)}-${numbers.slice(5, 8)}`
  }

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    if (numbers.length <= 4) return numbers
    if (numbers.length <= 8) return `${numbers.slice(0, 4)}-${numbers.slice(4)}`
    return `${numbers.slice(0, 5)}-${numbers.slice(5, 9)}`
  }

  if (loading) {
    return <Loading fullScreen text="Carregando perfil..." />
  }

  return (
    <div className="min-h-screen bg-surface-50 pb-24">
      <Header
        title="Perfil"
        showBack
        rightAction={
          <button
            onClick={handleSave}
            disabled={saving}
            className="text-primary-500 font-semibold disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        }
      />

      {/* Mensagem de feedback */}
      {message && (
        <div className={`mx-4 mt-4 p-3 rounded-xl flex items-center gap-2 ${
          message.type === 'success'
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.type === 'success' && <Check className="w-5 h-5" />}
          <span className="text-sm font-medium">{message.text}</span>
        </div>
      )}

      <div className="px-4 py-6 space-y-6">
        {/* Seção 1: Informações Pessoais */}
        <section className="card">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-5 h-5 text-primary-500" />
            <h2 className="font-semibold text-surface-900">Informações Pessoais</h2>
          </div>

          {/* Foto de Perfil */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
              />
              <button
                onClick={handlePhotoClick}
                className="w-24 h-24 rounded-full bg-surface-100 flex items-center justify-center overflow-hidden border-2 border-surface-200"
              >
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-10 h-10 text-surface-400" />
                )}
              </button>
              <div className="absolute bottom-0 right-0 w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center shadow-lg">
                <Camera className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-surface-600 mb-1">
                Nome Completo
              </label>
              <input
                type="text"
                value={profile.full_name}
                onChange={(e) => handleInputChange('full_name', e.target.value)}
                placeholder="Seu nome completo"
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-600 mb-1">
                Nome de Usuário
              </label>
              <input
                type="text"
                value={profile.username}
                onChange={(e) => handleInputChange('username', e.target.value.toLowerCase().replace(/\s/g, ''))}
                placeholder="seu_usuario"
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-600 mb-1">
                E-mail
              </label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="input bg-surface-50 text-surface-500 cursor-not-allowed"
              />
              <p className="text-xs text-surface-400 mt-1">
                O e-mail não pode ser alterado
              </p>
            </div>
          </div>
        </section>

        {/* Seção 2: Endereço */}
        <section className="card">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-5 h-5 text-primary-500" />
            <h2 className="font-semibold text-surface-900">Endereço</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-surface-600 mb-1">
                País
              </label>
              <select
                value={profile.country}
                onChange={(e) => handleInputChange('country', e.target.value)}
                className="input"
              >
                <option value="Brasil">Brasil</option>
                <option value="Portugal">Portugal</option>
                <option value="Estados Unidos">Estados Unidos</option>
                <option value="Outro">Outro</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-600 mb-1">
                CEP
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formatCep(profile.cep)}
                  onChange={(e) => handleInputChange('cep', e.target.value.replace(/\D/g, '').slice(0, 8))}
                  placeholder="00000-000"
                  maxLength={9}
                  className="input"
                />
                {loadingCep && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
              <p className="text-xs text-surface-400 mt-1">
                Digite o CEP para preencher automaticamente
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-surface-600 mb-1">
                  Estado
                </label>
                <input
                  type="text"
                  value={profile.state}
                  onChange={(e) => handleInputChange('state', e.target.value.toUpperCase().slice(0, 2))}
                  placeholder="UF"
                  maxLength={2}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-600 mb-1">
                  Cidade
                </label>
                <input
                  type="text"
                  value={profile.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  placeholder="Cidade"
                  className="input"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-600 mb-1">
                Bairro
              </label>
              <input
                type="text"
                value={profile.neighborhood}
                onChange={(e) => handleInputChange('neighborhood', e.target.value)}
                placeholder="Bairro"
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-600 mb-1">
                Rua
              </label>
              <input
                type="text"
                value={profile.street}
                onChange={(e) => handleInputChange('street', e.target.value)}
                placeholder="Rua, Avenida, etc."
                className="input"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-surface-600 mb-1">
                  Número
                </label>
                <input
                  type="text"
                  value={profile.number}
                  onChange={(e) => handleInputChange('number', e.target.value)}
                  placeholder="Nº"
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-600 mb-1">
                  Complemento
                </label>
                <input
                  type="text"
                  value={profile.complement}
                  onChange={(e) => handleInputChange('complement', e.target.value)}
                  placeholder="Apto, Sala..."
                  className="input"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Seção 3: Telefone */}
        <section className="card">
          <div className="flex items-center gap-2 mb-4">
            <Phone className="w-5 h-5 text-primary-500" />
            <h2 className="font-semibold text-surface-900">Telefone</h2>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-surface-600 mb-1">
                  País
                </label>
                <select
                  value={profile.country_code}
                  onChange={(e) => handleInputChange('country_code', e.target.value)}
                  className="input"
                >
                  <option value="+55">+55 (BR)</option>
                  <option value="+351">+351 (PT)</option>
                  <option value="+1">+1 (US)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-600 mb-1">
                  DDD
                </label>
                <input
                  type="text"
                  value={profile.area_code}
                  onChange={(e) => handleInputChange('area_code', e.target.value.replace(/\D/g, '').slice(0, 2))}
                  placeholder="00"
                  maxLength={2}
                  className="input"
                />
              </div>
              <div className="col-span-1">
                <label className="block text-sm font-medium text-surface-600 mb-1">
                  Número
                </label>
                <input
                  type="text"
                  value={formatPhone(profile.phone_number)}
                  onChange={(e) => handleInputChange('phone_number', e.target.value.replace(/\D/g, '').slice(0, 9))}
                  placeholder="00000-0000"
                  maxLength={10}
                  className="input"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Botão Salvar Mobile */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Check className="w-5 h-5" />
              Salvar Alterações
            </>
          )}
        </button>
      </div>
    </div>
  )
}
