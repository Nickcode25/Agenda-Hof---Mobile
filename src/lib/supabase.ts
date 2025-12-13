import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://zgdxszwjbbxepsvyjtrb.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpnZHhzendqYmJ4ZXBzdnlqdHJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MTU4MTAsImV4cCI6MjA3NDk5MTgxMH0.NZdEYYCOZlMUo5h7TM-gsSTxmgMx7ta9W_gsi7ZNHCA'

console.log('Supabase URL:', supabaseUrl)
console.log('Supabase Key exists:', !!supabaseAnonKey)

// Usando tipagem genérica para evitar erros de tipos com tabelas dinâmicas
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Importante para apps mobile
  },
})
