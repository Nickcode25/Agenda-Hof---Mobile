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
  planned_procedures?: string | null
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

// Helper para parsear planned_procedures
export function parsePlannedProcedures(jsonString?: string | null): PlannedProcedure[] {
  if (!jsonString) return []
  try {
    return JSON.parse(jsonString)
  } catch {
    return []
  }
}
