import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'
import { env, isSupabaseConfigured as envConfigured } from './env'
import { supabaseLogger as logger } from '../utils/logger'

// Get credentials from environment variables
const supabaseUrl = env.supabaseUrl
const supabaseAnonKey = env.supabaseAnonKey

// Re-export for backward compatibility
export const isSupabaseConfigured = envConfigured

// Debug logging (only in development)
logger.log('URL:', supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'NOT SET')
logger.log('Configured:', isSupabaseConfigured)

if (!isSupabaseConfigured) {
  logger.warn('Not configured - running in demo mode')
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
  logger.log('signIn called for:', email)
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    
    logger.log('signIn completed:', { 
      hasSession: !!data?.session, 
      hasUser: !!data?.user,
      hasError: !!error,
      errorMsg: error?.message 
    })
    
    return { data, error }
  } catch (err: any) {
    logger.error('signIn exception:', err)
    return { data: null, error: { message: err.message || 'Login failed' } }
  }
}

// Email OTP (Magic Link alternative with 6-digit code)
export const signInWithEmailOtp = async (email: string) => {
  logger.log('[Email OTP] Sending to:', email)
  
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
  logger.log('signInWithGoogle called')
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
  logger.log('signInWithFacebook called')
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