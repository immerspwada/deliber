import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

// Hardcoded for debugging - TODO: revert to env vars
const supabaseUrl = 'https://onsflqhkgqhydeupiqyt.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uc2ZscWhrZ3FoeWRldXBpcXl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0OTg5NTEsImV4cCI6MjA4MDA3NDk1MX0.UtlAxwHlcSTY7VEX6f2NcrN4xfbz4FjRTqGWro8BTRk'

// Check if Supabase is properly configured
export const isSupabaseConfigured = !!(
  import.meta.env.VITE_SUPABASE_URL && 
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

// Debug logging
console.log('[Supabase] URL:', supabaseUrl?.substring(0, 30) + '...')
console.log('[Supabase] Configured:', isSupabaseConfigured)

if (!isSupabaseConfigured) {
  console.warn('[Supabase] Not configured - running in demo mode')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Auth helpers
export const signUp = async (email: string, password: string, metadata?: object) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata
    }
  })
  return { data, error }
}

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  return { data, error }
}

export const signInWithPhone = async (phone: string) => {
  const { data, error } = await supabase.auth.signInWithOtp({
    phone
  })
  return { data, error }
}

export const verifyOtp = async (phone: string, token: string) => {
  const { data, error } = await supabase.auth.verifyOtp({
    phone,
    token,
    type: 'sms'
  })
  return { data, error }
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  return { error }
}

export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser()
  return { user, error }
}

export const onAuthStateChange = (callback: (event: string, session: any) => void) => {
  return supabase.auth.onAuthStateChange(callback)
}