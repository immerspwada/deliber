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
  console.log('[Supabase] signIn called for:', email)
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    
    console.log('[Supabase] signIn completed:', { 
      hasSession: !!data?.session, 
      hasUser: !!data?.user,
      hasError: !!error,
      errorMsg: error?.message 
    })
    
    return { data, error }
  } catch (err: any) {
    console.error('[Supabase] signIn exception:', err)
    return { data: null, error: { message: err.message || 'Login failed' } }
  }
}

// Email OTP (Magic Link alternative with 6-digit code)
export const signInWithEmailOtp = async (email: string) => {
  console.log('[Email OTP] Sending to:', email)
  
  const { data, error } = await supabase.auth.signInWithOtp({
    email: email,
    options: {
      shouldCreateUser: true // สร้าง user ใหม่ถ้ายังไม่มี
    }
  })
  return { data, error }
}

export const verifyEmailOtp = async (email: string, token: string) => {
  const { data, error } = await supabase.auth.verifyOtp({
    email: email,
    token,
    type: 'email'
  })
  return { data, error }
}

// Legacy phone functions (kept for compatibility)
export const signInWithPhone = async (phone: string) => {
  let formattedPhone = phone.replace(/[\s\-\(\)]/g, '')
  
  if (formattedPhone.startsWith('0')) {
    formattedPhone = '+66' + formattedPhone.substring(1)
  } else if (!formattedPhone.startsWith('+')) {
    formattedPhone = '+66' + formattedPhone
  }
  
  const { data, error } = await supabase.auth.signInWithOtp({
    phone: formattedPhone
  })
  return { data, error, formattedPhone }
}

export const verifyOtp = async (phone: string, token: string) => {
  let formattedPhone = phone.replace(/[\s\-\(\)]/g, '')
  
  if (formattedPhone.startsWith('0')) {
    formattedPhone = '+66' + formattedPhone.substring(1)
  } else if (!formattedPhone.startsWith('+')) {
    formattedPhone = '+66' + formattedPhone
  }
  
  const { data, error } = await supabase.auth.verifyOtp({
    phone: formattedPhone,
    token,
    type: 'sms'
  })
  return { data, error }
}

// Social Login - Google
export const signInWithGoogle = async () => {
  console.log('[Supabase] signInWithGoogle called')
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`
    }
  })
  return { data, error }
}

// Social Login - Facebook
export const signInWithFacebook = async () => {
  console.log('[Supabase] signInWithFacebook called')
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'facebook',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`
    }
  })
  return { data, error }
}

export const signOut = async () => {
  // Add timeout to prevent hanging on slow network
  const timeoutPromise = new Promise<{ error: Error }>((resolve) => 
    setTimeout(() => resolve({ error: new Error('Logout timeout') }), 3000)
  )
  
  const signOutPromise = supabase.auth.signOut().then(({ error }) => ({ error }))
  
  return Promise.race([signOutPromise, timeoutPromise])
}

export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser()
  return { user, error }
}

export const onAuthStateChange = (callback: (event: string, session: any) => void) => {
  return supabase.auth.onAuthStateChange(callback)
}