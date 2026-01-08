/**
 * Admin Authentication Store
 * ==========================
 * Pinia store for admin authentication state management
 * 
 * PRODUCTION MODE ONLY - Uses real Supabase Auth
 * Admin users must have role = 'admin' or 'super_admin' in users table
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../../lib/supabase'
import type { AdminUser, AdminSession, AdminRole } from '../types'
import { DEFAULT_PERMISSIONS, ROLE_LEVELS } from '../types/auth.types'

// Constants
const SESSION_TTL = 8 * 60 * 60 * 1000 // 8 hours
const STORAGE_KEYS = {
  SESSION: 'admin_v2_session'
}

export const useAdminAuthStore = defineStore('adminAuth', () => {
  // State
  const user = ref<AdminUser | null>(null)
  const session = ref<AdminSession | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const loginAttempts = ref(0)
  const isLocked = ref(false)
  const lockoutEndTime = ref(0)

  // Computed
  const isAuthenticated = computed(() => !!user.value && !!session.value)
  const isDemoMode = computed(() => false) // Always false - no demo mode
  const userRole = computed(() => user.value?.role ?? 'viewer')
  const userPermissions = computed(() => user.value?.permissions ?? [])
  
  const roleLevel = computed(() => {
    return user.value ? ROLE_LEVELS[user.value.role] : 0
  })

  // Permission check
  const hasPermission = (module: string, action: 'view' | 'create' | 'edit' | 'delete'): boolean => {
    if (!user.value) return false
    
    // Super admin has all permissions
    if (user.value.role === 'super_admin') return true
    
    const permission = user.value.permissions.find(
      (p: { module: string; actions: string[] }) => p.module === module || p.module === '*'
    )
    
    return permission?.actions.includes(action) ?? false
  }

  const canAccess = (module: string): boolean => {
    return hasPermission(module, 'view')
  }

  // Session management - stores admin user info (Supabase handles actual auth)
  const loadSession = (): boolean => {
    try {
      const storedSession = localStorage.getItem(STORAGE_KEYS.SESSION)
      if (!storedSession) return false

      const parsed = JSON.parse(storedSession) as AdminSession
      
      // Check expiry
      if (Date.now() > parsed.expiresAt) {
        clearSession()
        return false
      }

      session.value = parsed
      user.value = parsed.user
      return true
    } catch {
      clearSession()
      return false
    }
  }

  const saveSession = (adminUser: AdminUser, token: string) => {
    const now = Date.now()
    const newSession: AdminSession = {
      token,
      user: adminUser,
      loginTime: now,
      expiresAt: now + SESSION_TTL,
      isDemoMode: false // Always false
    }

    session.value = newSession
    user.value = adminUser
    localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(newSession))
  }

  const clearSession = () => {
    session.value = null
    user.value = null
    localStorage.removeItem(STORAGE_KEYS.SESSION)
  }

  // Login - PRODUCTION MODE: Real Supabase Auth only
  const login = async (email: string, password: string): Promise<boolean> => {
    const trimmedEmail = email.trim().toLowerCase()
    
    // Validation
    if (!trimmedEmail || !password) {
      error.value = 'กรุณากรอกอีเมลและรหัสผ่าน'
      return false
    }

    // Check lockout
    if (isLocked.value && Date.now() < lockoutEndTime.value) {
      const remaining = Math.ceil((lockoutEndTime.value - Date.now()) / 1000)
      error.value = `กรุณารออีก ${remaining} วินาที`
      return false
    }

    isLoading.value = true
    error.value = null

    try {
      // Real Supabase Auth login
      console.log('[Admin Auth] Attempting Supabase login for:', trimmedEmail)
      
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password
      })

      if (authError) {
        console.error('[Admin Auth] Supabase auth error:', authError)
        handleFailedLogin()
        return false
      }

      if (!authData?.user) {
        error.value = 'ไม่พบข้อมูลผู้ใช้'
        isLoading.value = false
        return false
      }

      console.log('[Admin Auth] Supabase auth successful, checking admin role...')

      // Check admin role in users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, email, first_name, last_name, role')
        .eq('id', authData.user.id)
        .maybeSingle() // Use maybeSingle to handle no rows gracefully

      // If user doesn't exist in users table, create a default record
      let userRecord = userData as { id: string; email: string; first_name?: string; last_name?: string; role?: string } | null
      
      if (userError) {
        console.error('[Admin Auth] User lookup error:', userError)
        // Continue anyway - we'll try to create the record below
      }
      
      if (!userRecord) {
        console.log('[Admin Auth] No user record found, will try to create one')
        userRecord = {
          id: authData.user.id,
          email: trimmedEmail,
          role: undefined
        }
      }
      
      console.log('[Admin Auth] User role:', userRecord.role)
      
      // If user exists in auth but not in users table, or has no admin role
      // Try to create/update user record
      if (!userRecord.role || (userRecord.role !== 'admin' && userRecord.role !== 'super_admin')) {
        console.log('[Admin Auth] User has no admin role, checking if we should create record...')
        
        // Check if this is a known admin email (for initial setup)
        const adminEmails = ['superadmin@gobear.app', 'admin@gobear.app']
        if (adminEmails.includes(trimmedEmail)) {
          console.log('[Admin Auth] Known admin email, creating/updating user record...')
          
          // Try to create user record with admin role
          const { error: createError } = await supabase
            .from('users')
            .upsert({
              id: authData.user.id,
              email: trimmedEmail,
              first_name: 'Super',
              last_name: 'Admin',
              role: 'super_admin',
              verification_status: 'verified'
            }, { onConflict: 'id' })
          
          if (createError) {
            console.error('[Admin Auth] Failed to create user record:', createError)
            error.value = 'ไม่สามารถสร้างข้อมูลผู้ใช้ได้'
            await supabase.auth.signOut()
            isLoading.value = false
            return false
          }
          
          // Update userRecord with new role
          userRecord.role = 'super_admin'
          console.log('[Admin Auth] User record created with super_admin role')
        } else {
          error.value = 'บัญชีนี้ไม่มีสิทธิ์เข้าถึง Admin (ต้องมี role = admin หรือ super_admin)'
          await supabase.auth.signOut()
          isLoading.value = false
          return false
        }
      }

      // Create admin user object
      const role = (userRecord.role as AdminRole) || 'admin'
      const permissions = DEFAULT_PERMISSIONS[role] as { module: string; actions: string[] }[]
      
      const adminUser: AdminUser = {
        id: userRecord.id,
        email: userRecord.email,
        name: `${userRecord.first_name || ''} ${userRecord.last_name || ''}`.trim() || userRecord.email,
        role,
        permissions,
        created_at: new Date().toISOString()
      }

      // Save session with real access token
      saveSession(adminUser, authData.session?.access_token || '')
      
      console.log('[Admin Auth] Login successful for admin:', adminUser.email)
      
      loginAttempts.value = 0
      isLocked.value = false
      isLoading.value = false
      return true

    } catch (e) {
      console.error('[Admin Auth] Login error:', e)
      error.value = 'เกิดข้อผิดพลาด กรุณาลองใหม่'
      isLoading.value = false
      return false
    }
  }

  const handleFailedLogin = () => {
    loginAttempts.value++
    
    if (loginAttempts.value >= 5) {
      isLocked.value = true
      lockoutEndTime.value = Date.now() + 60000 // 1 minute
      error.value = 'ล็อกอินผิดพลาดหลายครั้ง กรุณารอ 60 วินาที'
    } else {
      const remaining = 5 - loginAttempts.value
      error.value = `อีเมลหรือรหัสผ่านไม่ถูกต้อง (เหลือ ${remaining} ครั้ง)`
    }
    
    isLoading.value = false
  }

  // Logout
  const logout = async () => {
    clearSession()
    
    try {
      await supabase.auth.signOut()
      console.log('[Admin Auth] Logged out successfully')
    } catch (e) {
      console.error('[Admin Auth] Logout error:', e)
    }
  }

  // Initialize - verify Supabase session is valid
  const initialize = async (): Promise<boolean> => {
    console.log('[Admin Auth] Initializing...')
    
    // First check if we have a stored session
    const hasStoredSession = loadSession()
    
    if (!hasStoredSession) {
      console.log('[Admin Auth] No stored session found')
      return false
    }

    // Verify Supabase session is still valid
    try {
      const { data: { session: supaSession } } = await supabase.auth.getSession()
      
      if (!supaSession) {
        console.log('[Admin Auth] Supabase session expired, clearing local session')
        clearSession()
        return false
      }

      // Verify user still has admin role
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', supaSession.user.id)
        .single()

      if (userError || !userData) {
        console.log('[Admin Auth] User not found, clearing session')
        clearSession()
        await supabase.auth.signOut()
        return false
      }

      const userRecord = userData as { role?: string }
      
      if (userRecord.role !== 'admin' && userRecord.role !== 'super_admin') {
        console.log('[Admin Auth] User no longer has admin role')
        clearSession()
        await supabase.auth.signOut()
        return false
      }

      console.log('[Admin Auth] Session valid, user authenticated')
      return true
    } catch (e) {
      console.error('[Admin Auth] Initialize error:', e)
      // Keep session if network error (offline support)
      return hasStoredSession
    }
  }

  return {
    // State
    user,
    session,
    isLoading,
    error,
    loginAttempts,
    isLocked,
    lockoutEndTime,
    
    // Computed
    isAuthenticated,
    isDemoMode,
    userRole,
    userPermissions,
    roleLevel,
    
    // Methods
    hasPermission,
    canAccess,
    login,
    logout,
    initialize,
    loadSession,
    clearSession
  }
})
