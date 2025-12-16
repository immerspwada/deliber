import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase, signIn, signUp, signOut, signInWithPhone, verifyOtp } from '../lib/supabase'
import type { User, UserUpdate } from '../types/database'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const session = ref<any>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const isDemoMode = computed(() => localStorage.getItem('demo_mode') === 'true')
  const isAuthenticated = computed(() => !!session.value || isDemoMode.value)
  const isVerified = computed(() => user.value?.is_active === true)

  // Initialize auth state
  const initialize = async () => {
    loading.value = true
    try {
      // Check demo mode first - instant return
      if (isDemoMode.value) {
        const demoUser = localStorage.getItem('demo_user')
        if (demoUser) {
          user.value = JSON.parse(demoUser) as User
        }
        loading.value = false
        return
      }
      
      // Check if we have any indication of a real session before calling Supabase
      // This avoids slow network calls when user is not logged in
      const hasStoredSession = localStorage.getItem('sb-' + import.meta.env.VITE_SUPABASE_URL?.split('//')[1]?.split('.')[0] + '-auth-token')
      
      if (!hasStoredSession) {
        // No stored session - skip Supabase call entirely
        loading.value = false
        return
      }
      
      // Has stored session - verify with Supabase (with timeout)
      const sessionPromise = supabase.auth.getSession()
      const timeoutPromise = new Promise<null>((resolve) => 
        setTimeout(() => resolve(null), 1000)
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

  // Fetch user profile from database
  const fetchUserProfile = async (userId: string) => {
    const { data, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (fetchError) {
      error.value = fetchError.message
      return
    }
    
    user.value = data
  }

  // Alias for login
  const login = async (email: string, password: string) => {
    return loginWithEmail(email, password)
  }

  // Register with email and password
  const register = async (email: string, password: string, userData: {
    name: string
    phone: string
    role?: string
    nationalId?: string
  }) => {
    loading.value = true
    error.value = null
    
    try {
      // Sign up with Supabase Auth
      const { data, error: signUpError } = await signUp(email, password, {
        name: userData.name,
        phone: userData.phone
      })
      
      if (signUpError) {
        error.value = signUpError.message
        return false
      }
      
      // Create user profile in database
      if (data.user) {
        // Parse name into first and last name
        const nameParts = userData.name.trim().split(' ')
        const firstName = nameParts[0] || ''
        const lastName = nameParts.slice(1).join(' ') || ''
        
        const userProfile = {
          id: data.user.id,
          email: email,
          phone_number: userData.phone,
          first_name: firstName,
          last_name: lastName,
          national_id: userData.nationalId || '0000000000000', // Placeholder if not provided
          verification_status: 'pending'
        }
        
        const { error: profileError } = await supabase
          .from('users')
          .insert(userProfile as any)
        
        if (profileError) {
          console.error('Profile creation error:', profileError)
          // Don't fail registration if profile creation fails
          // User can update profile later
        }
        
        // If role is driver/rider, create service_provider entry
        if (userData.role && userData.role !== 'customer') {
          const providerType = userData.role === 'driver' ? 'driver' : 'delivery'
          await (supabase.from('service_providers') as any).insert({
            user_id: data.user.id,
            provider_type: providerType,
            status: 'pending'
          })
        }
      }
      
      return true
    } catch (err: any) {
      error.value = err.message
      return false
    } finally {
      loading.value = false
    }
  }

  // Login with email and password
  const loginWithEmail = async (email: string, password: string) => {
    loading.value = true
    error.value = null
    
    try {
      const { data, error: loginError } = await signIn(email, password)
      
      if (loginError) {
        error.value = loginError.message
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

  // Verify OTP
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

  // Logout
  const logout = async () => {
    loading.value = true
    error.value = null
    
    try {
      // Clear demo mode
      localStorage.removeItem('demo_mode')
      localStorage.removeItem('demo_user')
      
      const { error: logoutError } = await signOut()
      
      if (logoutError && !isDemoMode.value) {
        error.value = logoutError.message
        return false
      }
      
      user.value = null
      session.value = null
      
      return true
    } catch (err: any) {
      error.value = err.message
      return false
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
    session.value = newSession
    
    if (event === 'SIGNED_IN' && newSession?.user) {
      await fetchUserProfile(newSession.user.id)
    } else if (event === 'SIGNED_OUT') {
      user.value = null
    }
  })

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
    logout,
    updateProfile
  }
})