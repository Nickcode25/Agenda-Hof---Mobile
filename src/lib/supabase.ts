import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://zgdxszwjbbxepsvyjtrb.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// Usando tipagem genérica para evitar erros de tipos com tabelas dinâmicas
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Importante para apps mobile
  },
})
