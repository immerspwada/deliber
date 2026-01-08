import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase, signIn, signUp, signOut, signInWithPhone, verifyOtp, signInWithEmailOtp, verifyEmailOtp as verifyEmailOtpApi, signInWithGoogle, signInWithFacebook } from '../lib/supabase'
import { env, isDev } from '../lib/env'
import { authLogger as logger } from '../utils/logger'
import { resetWalletState } from '../composables/useWallet'
import type { User, UserUpdate } from '../types/database'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const session = ref<any>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const isLoggingIn = ref(false) // Flag to prevent duplicate fetchUserProfile calls

  // Demo mode for testing without Supabase (only in development or when Supabase not configured)
  const isDemoMode = computed(() => {
    const demoEnabled = localStorage.getItem('demo_mode') === 'true'
    // In production, only allow demo mode if explicitly enabled AND Supabase is not configured
    if (!isDev && env.isSupabaseConfigured) {
      return false
    }
    return demoEnabled
  })
  const isAuthenticated = computed(() => !!session.value || isDemoMode.value)
  const isVerified = computed(() => user.value?.is_active === true)

  // Demo users data
  const demoUsers: Record<string, User> = {
    'customer@demo.com': {
      id: '22222222-2222-2222-2222-222222222222',
      email: 'customer@demo.com',
      name: 'Customer Demo',
      phone: '0812345678',
      role: 'customer',
      is_active: true,
      created_at: new Date().toISOString()
    } as User,
    'driver1@demo.com': {
      id: 'd1111111-1111-1111-1111-111111111111',
      email: 'driver1@demo.com',
      name: 'สมชาย ใจดี',
      phone: '0898765432',
      role: 'driver',
      is_active: true,
      created_at: new Date().toISOString()
    } as User,
    'rider@demo.com': {
      id: '44444444-4444-4444-4444-444444444444',
      email: 'rider@demo.com',
      name: 'Rider User',
      phone: '0876543210',
      role: 'rider',
      is_active: true,
      created_at: new Date().toISOString()
    } as User,
    'admin@demo.com': {
      id: '11111111-1111-1111-1111-111111111111',
      email: 'admin@demo.com',
      name: 'Admin Demo',
      phone: '0800000000',
      role: 'admin',
      is_active: true,
      created_at: new Date().toISOString()
    } as User
  }

  // Initialize auth state
  const initialize = async () => {
    loading.value = true
    try {
      // Check for demo mode first
      const demoMode = localStorage.getItem('demo_mode')
      const demoUserEmail = localStorage.getItem('demo_user')
      
      if (demoMode === 'true' && demoUserEmail && demoUsers[demoUserEmail]) {
        user.value = demoUsers[demoUserEmail]
        session.value = { user: { id: user.value.id } }
        loading.value = false
        return
      }
      
      // Check for real Supabase session
      const projectRef = env.projectRef
      const hasStoredSession = projectRef ? localStorage.getItem('sb-' + projectRef + '-auth-token') : null
      
      if (!hasStoredSession) {
        loading.value = false
        return
      }
      
      // Has stored session - verify with Supabase (with timeout)
      const sessionPromise = supabase.auth.getSession()
      const timeoutPromise = new Promise<null>((resolve) => 
        setTimeout(() => resolve(null), 2000)
      )
      
      const result = await Promise.race([sessionPromise, timeoutPromise])
      
      if (result && 'data' in result) {
        session.value = result.data.session
        if (result.data.session?.user) {
          await fetchUserProfile(result.data.session.user.id)
        }
      }
    } catch (err: any) {
      error.value = err.message
    } finally {
      loading.value = false
    }
  }

  // Fetch user profile from database - FAST VERSION
  const fetchUserProfile = async (userId: string) => {
    logger.log('fetchUserProfile started for:', userId)
    
    // IMMEDIATELY set user from session first (instant display)
    const currentSession = session.value
    if (currentSession?.user) {
      logger.log('Setting user from session immediately')
      user.value = {
        id: currentSession.user.id,
        email: currentSession.user.email || '',
        name: currentSession.user.user_metadata?.name || currentSession.user.email?.split('@')[0] || '',
        phone: currentSession.user.user_metadata?.phone || '',
        role: currentSession.user.user_metadata?.role || 'customer',
        is_active: true,
        created_at: currentSession.user.created_at || new Date().toISOString()
      } as User
    }
    
    // Then try to fetch full profile in background (non-blocking)
    try {
      const timeoutPromise = new Promise<{ data: null; error: { message: string } }>((resolve) => {
        setTimeout(() => resolve({ data: null, error: { message: 'timeout' } }), 3000)
      })
      
      // Use maybeSingle() to avoid 406 error if user profile doesn't exist yet
      const fetchPromise = supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle()
      
      const { data, error: fetchError } = await Promise.race([fetchPromise, timeoutPromise])
      
      if (data && !fetchError) {
        user.value = data as User
        logger.log('User profile updated from DB:', (data as any)?.email)
      }
      
      // Sync pending performance metrics after successful login (non-blocking)
      syncPendingAnalytics()
    } catch (err: any) {
      logger.warn('fetchUserProfile background fetch failed:', err.message)
    }
  }
  
  // Sync pending analytics metrics (non-blocking background task)
  const syncPendingAnalytics = async () => {
    try {
      const pendingMetrics = JSON.parse(localStorage.getItem('pending_metrics') || '[]')
      if (pendingMetrics.length === 0) return
      
      const userId = user.value?.id
      if (!userId) return
      
      let synced = 0
      for (const metric of pendingMetrics) {
        try {
          await (supabase.from('analytics_events') as any).insert({
            session_id: metric.session_id || `sync_${Date.now()}`,
            event_name: 'page_performance',
            event_category: 'performance',
            properties: metric,
            page_url: metric.page || 'unknown',
            device_type: metric.deviceType || 'unknown',
            user_id: userId
          })
          synced++
        } catch {
          // Ignore individual failures
        }
      }
      
      if (synced > 0) {
        localStorage.removeItem('pending_metrics')
      }
    } catch {
      // Silently ignore sync errors
    }
  }

  // Alias for login
  const login = async (email: string, password: string) => {
    return loginWithEmail(email, password)
  }

  // Register with email and password (simplified - no nationalId required)
  const register = async (email: string, password: string, userData: {
    name: string
    phone: string
    role?: string
  }) => {
    loading.value = true
    error.value = null
    
    try {
      // Parse name into first and last name
      const nameParts = userData.name.trim().split(' ')
      const firstName = nameParts[0] || ''
      const lastName = nameParts.slice(1).join(' ') || ''
      const role = userData.role || 'customer'
      
      // Sign up with Supabase Auth (trigger will auto-create user profile)
      const { data, error: signUpError } = await signUp(email, password, {
        name: userData.name,
        phone: userData.phone,
        role: role
      })
      
      if (signUpError) {
        // Handle specific error messages
        if (signUpError.message.includes('already registered')) {
          error.value = 'อีเมลนี้ถูกใช้งานแล้ว'
        } else if (signUpError.message.includes('password')) {
          error.value = 'รหัสผ่านไม่ถูกต้อง (ต้องมีอย่างน้อย 6 ตัวอักษร)'
        } else {
          error.value = signUpError.message
        }
        return false
      }
      
      // Complete registration with additional data
      if (data.user) {
        // Use RPC function to complete registration (simplified - no nationalId)
        const { data: rpcResult, error: rpcError } = await supabase.rpc('complete_user_registration', {
          p_user_id: data.user.id,
          p_first_name: firstName,
          p_last_name: lastName,
          p_phone_number: userData.phone,
          p_role: role
        } as Record<string, unknown>)
        
        if (rpcError) {
          logger.error('Registration completion error:', rpcError)
          // Fallback: direct update if RPC fails
          await supabase
            .from('users')
            .upsert({
              id: data.user.id,
              email: email,
              name: userData.name,
              phone: userData.phone,
              role: role,
              is_active: true
            } as Record<string, unknown>, { onConflict: 'id' })
        } else if (rpcResult && !(rpcResult as Record<string, unknown>).success) {
          error.value = (rpcResult as Record<string, unknown>).error as string || 'ไม่สามารถสมัครสมาชิกได้'
          return false
        }
        
        // If role is driver/rider, create service_provider entry
        if (role === 'driver' || role === 'rider') {
          const providerType = role === 'driver' ? 'driver' : 'delivery'
          const { error: providerError } = await (supabase.from('service_providers') as ReturnType<typeof supabase.from>).insert({
            user_id: data.user.id,
            provider_type: providerType,
            is_available: false,
            is_verified: false,
            rating: 5.0,
            total_trips: 0
          })
          
          if (providerError && providerError.code !== '23505') {
            logger.error('Provider creation error:', providerError)
          }
        }
      }
      
      return true
    } catch (err: unknown) {
      error.value = (err as Error).message || 'เกิดข้อผิดพลาดในการสมัครสมาชิก'
      return false
    } finally {
      loading.value = false
    }
  }

  // Login with email and password
  const loginWithEmail = async (emailInput: string, passwordInput: string) => {
    loading.value = true
    error.value = null
    isLoggingIn.value = true
    logger.log('loginWithEmail started:', emailInput)
    
    // Check for demo accounts first (only in dev or when Supabase not configured)
    const demoPasswords: Record<string, string> = {
      'customer@demo.com': 'demo1234',
      'driver1@demo.com': 'demo1234',
      'rider@demo.com': 'demo1234',
      'admin@demo.com': 'admin1234'
    }
    
    const allowDemoLogin = isDev || !env.isSupabaseConfigured
    if (allowDemoLogin && demoUsers[emailInput] && demoPasswords[emailInput] === passwordInput) {
      logger.log('Demo login for:', emailInput)
      localStorage.setItem('demo_mode', 'true')
      localStorage.setItem('demo_user', emailInput)
      user.value = demoUsers[emailInput]
      session.value = { user: { id: user.value.id } }
      loading.value = false
      isLoggingIn.value = false
      return true
    }
    
    // Try real Supabase login with timeout
    try {
      logger.log('Trying Supabase signIn...')
      
      // Create timeout promise
      const timeoutPromise = new Promise<{ data: null; error: { message: string } }>((resolve) => {
        setTimeout(() => {
          logger.warn('Supabase signIn TIMEOUT')
          resolve({ data: null, error: { message: 'Login timeout - using demo mode' } })
        }, 5000)
      })
      
      const result = await Promise.race([signIn(emailInput, passwordInput), timeoutPromise])
      
      if (result?.error) {
        logger.error('Login error:', result.error.message)
        // Handle specific error messages in Thai
        if (result.error.message.includes('Email not confirmed')) {
          error.value = 'กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ (ตรวจสอบกล่องจดหมายของคุณ)'
        } else if (result.error.message.includes('Invalid login credentials')) {
          error.value = 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'
        } else {
          error.value = result.error.message
        }
        loading.value = false
        isLoggingIn.value = false
        return false
      }
      
      if (!result?.data?.session) {
        logger.error('No session returned')
        error.value = 'ไม่สามารถเข้าสู่ระบบได้'
        loading.value = false
        isLoggingIn.value = false
        return false
      }
      
      logger.log('Setting session...')
      session.value = result.data.session
      
      if (result.data.user) {
        logger.log('Fetching user profile for:', result.data.user.id)
        await fetchUserProfile(result.data.user.id)
      }
      
      logger.log('Login successful')
      loading.value = false
      isLoggingIn.value = false
      return true
    } catch (err: any) {
      logger.error('Login exception:', err)
      error.value = err.message || 'เกิดข้อผิดพลาด'
      loading.value = false
      isLoggingIn.value = false
      return false
    }
  }

  // Login with phone (OTP)
  const loginWithPhone = async (phone: string) => {
    loading.value = true
    error.value = null
    
    try {
      const { error: otpError } = await signInWithPhone(phone)
      
      if (otpError) {
        error.value = otpError.message
        return false
      }
      
      return true
    } catch (err: any) {
      error.value = err.message
      return false
    } finally {
      loading.value = false
    }
  }

  // Verify Phone OTP
  const verifyPhoneOtp = async (phone: string, token: string) => {
    loading.value = true
    error.value = null
    
    try {
      const { data, error: verifyError } = await verifyOtp(phone, token)
      
      if (verifyError) {
        error.value = verifyError.message
        return false
      }
      
      session.value = data.session
      if (data.user) {
        await fetchUserProfile(data.user.id)
      }
      
      return true
    } catch (err: any) {
      error.value = err.message
      return false
    } finally {
      loading.value = false
    }
  }

  // Login with Email OTP
  const loginWithEmailOtp = async (email: string) => {
    loading.value = true
    error.value = null
    
    try {
      const { error: otpError } = await signInWithEmailOtp(email)
      
      if (otpError) {
        error.value = otpError.message
        return false
      }
      
      return true
    } catch (err: any) {
      error.value = err.message
      return false
    } finally {
      loading.value = false
    }
  }

  // Verify Email OTP
  const verifyEmailOtp = async (email: string, token: string) => {
    loading.value = true
    error.value = null
    
    try {
      const { data, error: verifyError } = await verifyEmailOtpApi(email, token)
      
      if (verifyError) {
        error.value = verifyError.message
        return false
      }
      
      session.value = data.session
      if (data.user) {
        await fetchUserProfile(data.user.id)
      }
      
      return true
    } catch (err: any) {
      error.value = err.message
      return false
    } finally {
      loading.value = false
    }
  }

  // Logout
  const logout = async () => {
    loading.value = true
    error.value = null
    
    try {
      // Clear local state immediately for instant feedback
      localStorage.removeItem('demo_mode')
      localStorage.removeItem('demo_user')
      
      // Clear user state immediately
      user.value = null
      session.value = null
      
      // Reset wallet singleton state to prevent data leakage between users
      resetWalletState()
      
      // Sign out from Supabase (don't wait too long)
      // Use Promise.race with timeout to prevent hanging
      const signOutPromise = signOut()
      const timeoutPromise = new Promise<{ error: null }>((resolve) => 
        setTimeout(() => resolve({ error: null }), 2000)
      )
      
      await Promise.race([signOutPromise, timeoutPromise])
      
      return true
    } catch (err: any) {
      // Even on error, we've already cleared local state
      logger.error('Logout error:', err)
      return true // Return true anyway since local state is cleared
    } finally {
      loading.value = false
    }
  }

  // Update user profile
  const updateProfile = async (updates: UserUpdate) => {
    if (!user.value) return false
    
    loading.value = true
    error.value = null
    
    try {
      const { data, error: updateError } = await (supabase
        .from('users') as any)
        .update(updates)
        .eq('id', user.value.id)
        .select()
        .single()
      
      if (updateError) {
        error.value = updateError.message
        return false
      }
      
      user.value = data as User
      return true
    } catch (err: any) {
      error.value = err.message
      return false
    } finally {
      loading.value = false
    }
  }

  // Listen to auth state changes
  supabase.auth.onAuthStateChange(async (event, newSession) => {
    logger.log('onAuthStateChange:', event, 'isLoggingIn:', isLoggingIn.value)
    session.value = newSession
    
    // Skip if we're in the middle of loginWithEmail (it will handle fetchUserProfile itself)
    if (isLoggingIn.value) {
      logger.log('Skipping fetchUserProfile - login in progress')
      return
    }
    
    if (event === 'SIGNED_IN' && newSession?.user) {
      await fetchUserProfile(newSession.user.id)
    } else if (event === 'SIGNED_OUT') {
      user.value = null
    }
  })

  // Social Login - Google
  const loginWithGoogle = async () => {
    loading.value = true
    error.value = null
    
    try {
      const { error: googleError } = await signInWithGoogle()
      
      if (googleError) {
        error.value = googleError.message
        return false
      }
      
      return true
    } catch (err: any) {
      error.value = err.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบด้วย Google'
      return false
    } finally {
      loading.value = false
    }
  }

  // Social Login - Facebook
  const loginWithFacebook = async () => {
    loading.value = true
    error.value = null
    
    try {
      const { error: fbError } = await signInWithFacebook()
      
      if (fbError) {
        error.value = fbError.message
        return false
      }
      
      return true
    } catch (err: any) {
      error.value = err.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบด้วย Facebook'
      return false
    } finally {
      loading.value = false
    }
  }

  return {
    user,
    session,
    loading,
    error,
    isDemoMode,
    isAuthenticated,
    isVerified,
    initialize,
    login,
    register,
    loginWithEmail,
    loginWithPhone,
    verifyPhoneOtp,
    loginWithEmailOtp,
    verifyEmailOtp,
    loginWithGoogle,
    loginWithFacebook,
    logout,
    updateProfile
  }
})