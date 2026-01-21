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

  // PRODUCTION ONLY - No demo mode
  const isDemoMode = computed(() => false)
  const isAuthenticated = computed(() => !!session.value)
  const isVerified = computed(() => user.value?.is_active === true)

  // Initialize auth state - PRODUCTION VERSION
  const initialize = async (): Promise<void> => {
    if (loading.value) {
      console.log('[Auth] Already initializing, skipping...')
      return // ป้องกันการ initialize ซ้ำ
    }
    
    console.log('[Auth] Starting initialization...')
    loading.value = true
    try {
      // SECURITY FIX: Use Supabase's built-in session management
      // Get current session with shorter timeout for better UX
      console.log('[Auth] Getting session from Supabase...')
      const sessionPromise = supabase.auth.getSession()
      const timeoutPromise = new Promise<{ data: { session: null } }>((resolve) => 
        setTimeout(() => {
          console.log('[Auth] Session fetch timeout after 5 seconds')
          resolve({ data: { session: null } })
        }, 5000) // เพิ่มเป็น 5 วินาที
      )
      
      const result = await Promise.race([sessionPromise, timeoutPromise])
      console.log('[Auth] Session result:', { hasSession: !!(result?.data?.session), result })
      
      if (result && 'data' in result && result.data.session) {
        console.log('[Auth] Valid session found, setting up user...')
        session.value = result.data.session
        if (result.data.session.user) {
          // Set basic user info immediately for faster UI response
          const sessionUser = result.data.session.user
          user.value = {
            id: sessionUser.id,
            email: sessionUser.email || '',
            name: sessionUser.user_metadata?.name || 
                  sessionUser.email?.split('@')[0] || '',
            phone: sessionUser.user_metadata?.phone || '',
            role: sessionUser.user_metadata?.role || 'customer',
            is_active: true,
            created_at: sessionUser.created_at || new Date().toISOString()
          } as User
          
          console.log('[Auth] User set from session:', user.value.email)
          
          // Fetch full profile in background (non-blocking)
          fetchUserProfile(sessionUser.id).catch(err => {
            console.warn('Background profile fetch failed:', err)
          })
        }
      } else {
        // No valid session found
        console.log('[Auth] No valid session found')
        session.value = null
        user.value = null
      }
    } catch (err: any) {
      console.error('[Auth] Initialization error:', err)
      error.value = err.message
      // Set default state on error
      session.value = null
      user.value = null
    } finally {
      loading.value = false
      console.log('[Auth] Initialization complete. Final state:', {
        hasUser: !!user.value,
        hasSession: !!session.value,
        isAuthenticated: !!session.value,
        userEmail: user.value?.email
      })
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
          // CRITICAL FIX: Use providers_v2 table consistently
          const { error: providerError } = await (supabase.from('providers_v2') as ReturnType<typeof supabase.from>).insert({
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

  // Login with email and password - PRODUCTION ONLY
  const loginWithEmail = async (emailInput: string, passwordInput: string) => {
    loading.value = true
    error.value = null
    isLoggingIn.value = true
    logger.log('loginWithEmail started:', emailInput)
    
    // Try real Supabase login with timeout
    try {
      logger.log('Trying Supabase signIn...')
      
      // Create timeout promise
      const timeoutPromise = new Promise<{ data: null; error: { message: string } }>((resolve) => {
        setTimeout(() => {
          logger.warn('Supabase signIn TIMEOUT')
          resolve({ data: null, error: { message: 'Login timeout - please try again' } })
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

  // Logout - PRODUCTION ONLY
  const logout = async () => {
    loading.value = true
    error.value = null
    
    try {
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

  // Listen to auth state changes - IMPROVED VERSION
  supabase.auth.onAuthStateChange(async (event, newSession) => {
    logger.log('onAuthStateChange:', event, 'isLoggingIn:', isLoggingIn.value)
    session.value = newSession
    
    // Skip if we're in the middle of loginWithEmail (it will handle fetchUserProfile itself)
    if (isLoggingIn.value) {
      logger.log('Skipping fetchUserProfile - login in progress')
      return
    }
    
    if (event === 'SIGNED_IN' && newSession?.user) {
      // Set basic user info immediately
      user.value = {
        id: newSession.user.id,
        email: newSession.user.email || '',
        name: newSession.user.user_metadata?.name || 
              newSession.user.email?.split('@')[0] || '',
        phone: newSession.user.user_metadata?.phone || '',
        role: newSession.user.user_metadata?.role || 'customer',
        is_active: true,
        created_at: newSession.user.created_at || new Date().toISOString()
      } as User
      
      // Fetch full profile in background
      fetchUserProfile(newSession.user.id).catch(err => {
        console.warn('Background profile fetch failed:', err)
      })
    } else if (event === 'SIGNED_OUT') {
      user.value = null
      // Clear any cached data
      resetWalletState()
    } else if (event === 'TOKEN_REFRESHED' && newSession?.user) {
      // Session refreshed, ensure user data is still valid
      if (!user.value || user.value.id !== newSession.user.id) {
        await fetchUserProfile(newSession.user.id)
      }
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

// Auto-initialize auth store when imported (for better session restore)
// This ensures session is restored as soon as the store is created
let autoInitialized = false
export const initializeAuthStore = async (): Promise<void> => {
  if (autoInitialized) return
  autoInitialized = true
  
  try {
    const store = useAuthStore()
    await store.initialize()
  } catch (error) {
    console.warn('[Auth] Auto-initialization failed:', error)
  }
}