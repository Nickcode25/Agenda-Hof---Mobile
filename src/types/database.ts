// Tipos baseados na estrutura real do Supabase

export interface Database {
  public: {
    Tables: {
      patients: {
        Row: Patient
        Insert: Omit<Patient, 'id' | 'created_at'>
        Update: Partial<Omit<Patient, 'id'>>
      }
      appointments: {
        Row: Appointment
        Insert: Omit<Appointment, 'id' | 'created_at'>
        Update: Partial<Omit<Appointment, 'id'>>
      }
      procedures: {
        Row: Procedure
        Insert: Omit<Procedure, 'id' | 'created_at'>
        Update: Partial<Omit<Procedure, 'id'>>
      }
      recurring_blocks: {
        Row: RecurringBlock
        Insert: Omit<RecurringBlock, 'id' | 'created_at'>
        Update: Partial<Omit<RecurringBlock, 'id'>>
      }
      courtesy_users: {
        Row: CourtesyUser
        Insert: Omit<CourtesyUser, 'id' | 'created_at'>
        Update: Partial<Omit<CourtesyUser, 'id'>>
      }
    }
  }
}

export interface Patient {
  id: string
  created_at: string
  updated_at: string
  user_id: string
  name: string
  cpf?: string | null
  birth_date?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  photo_url?: string | null
  notes?: string | null
  is_active: boolean
  planned_procedures?: string | PlannedProcedure[] | null
  cep?: string | null
  street?: string | null
  number?: string | null
  complement?: string | null
  neighborhood?: string | null
  city?: string | null
  state?: string | null
  clinical_info?: string | null
}

export interface PlannedProcedure {
  id: string
  procedureName: string
  quantity: number
  unitValue: number
  totalValue: number
  status: 'pending' | 'completed'
  notes?: string
  createdAt: string
  completedAt?: string
  paymentType: 'cash' | 'card' | 'installment' | 'default'
  paymentMethod?: 'pix' | 'card' | 'cash'
  installments?: number
  usedProductId?: string
  usedProductName?: string
}

export interface Appointment {
  id: string
  created_at: string
  updated_at: string
  user_id: string
  patient_id: string
  patient_name: string
  procedure: string
  procedure_id?: string | null
  selected_products?: string | null
  professional: string
  room?: string | null
  start: string // timestamp ISO: "2025-10-15 12:00:00+00"
  end: string   // timestamp ISO: "2025-10-15 13:00:00+00"
  notes?: string | null
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'done'
  // Campos para compromissos pessoais
  is_personal?: boolean | null
  title?: string | null // Título para compromissos pessoais
  // Campo populado via join
  patient?: Patient
}

export interface Procedure {
  id: string
  created_at: string
  user_id: string
  name: string
  price: number
  duration_minutes: number
  description?: string | null
  is_active: boolean
}

export interface User {
  id: string
  email: string
  name?: string
  avatar_url?: string
}

// Bloqueios Recorrentes (ex: Almoço de 12:00-13:30 de Segunda a Sexta)
export interface RecurringBlock {
  id: string
  created_at: string
  updated_at?: string
  user_id: string
  title: string
  start_time: string // HH:mm:ss
  end_time: string // HH:mm:ss
  days_of_week: number[] // 0=Domingo, 1=Segunda, ..., 6=Sábado
  active: boolean // Campo no banco é 'active', não 'is_active'
  notes?: string | null
}

// Nota: Compromissos Pessoais usam a mesma tabela appointments com is_personal = true
// O campo title é usado para o nome do compromisso

// Usuários de cortesia (acesso gratuito)
export interface CourtesyUser {
  id: string
  created_at: string
  user_id: string
  email: string
  notes?: string | null
  expires_at?: string | null // Data de expiração opcional
}

// Helper para parsear planned_procedures
// Supabase pode retornar como string JSON ou como objeto já parseado
export function parsePlannedProcedures(data?: string | PlannedProcedure[] | null): PlannedProcedure[] {
  if (!data) return []

  // Se já é um array (Supabase retornou como objeto), retorna diretamente
  if (Array.isArray(data)) {
    return data
  }

  // Se é string, tenta parsear
  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      console.error('[parsePlannedProcedures] Failed to parse:', data)
      return []
    }
  }

  return []
}
