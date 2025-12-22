/**
 * Admin Authentication Store
 * ==========================
 * Pinia store for admin authentication state management
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../../lib/supabase'
import type { AdminUser, AdminSession, AdminRole, Permission } from '../types'
import { DEFAULT_PERMISSIONS, ROLE_LEVELS } from '../types/auth.types'

// Constants
const SESSION_TTL = 8 * 60 * 60 * 1000 // 8 hours
const STORAGE_KEYS = {
  TOKEN: 'admin_v2_token',
  USER: 'admin_v2_user',
  SESSION: 'admin_v2_session'
}

// Demo admin for development
const DEMO_ADMIN: AdminUser = {
  id: 'demo-admin-001',
  email: 'admin@demo.com',
  name: 'Demo Admin',
  role: 'admin',
  permissions: DEFAULT_PERMISSIONS.admin,
  created_at: new Date().toISOString()
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
  const isDemoMode = computed(() => session.value?.isDemoMode ?? false)
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
      p => p.module === module || p.module === '*'
    )
    
    return permission?.actions.includes(action) ?? false
  }

  const canAccess = (module: string): boolean => {
    return hasPermission(module, 'view')
  }

  // Session management
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

  const saveSession = (adminUser: AdminUser, token: string, demoMode: boolean) => {
    const now = Date.now()
    const newSession: AdminSession = {
      token,
      user: adminUser,
      loginTime: now,
      expiresAt: now + SESSION_TTL,
      isDemoMode: demoMode
    }

    session.value = newSession
    user.value = adminUser
    localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(newSession))
  }

  const clearSession = () => {
    session.value = null
    user.value = null
    localStorage.removeItem(STORAGE_KEYS.SESSION)
    localStorage.removeItem(STORAGE_KEYS.TOKEN)
    localStorage.removeItem(STORAGE_KEYS.USER)
  }

  // Login
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
      // Demo mode login
      if (trimmedEmail === 'admin@demo.com' && password === 'admin1234') {
        await new Promise(resolve => setTimeout(resolve, 500)) // UX delay
        saveSession(DEMO_ADMIN, 'demo_token', true)
        loginAttempts.value = 0
        isLocked.value = false
        isLoading.value = false
        return true
      }

      // Supabase login
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password
      })

      if (authError) {
        handleFailedLogin()
        return false
      }

      if (!authData?.user) {
        error.value = 'ไม่พบข้อมูลผู้ใช้'
        isLoading.value = false
        return false
      }

      // Check admin role
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, email, first_name, last_name, role')
        .eq('id', authData.user.id)
        .single()

      if (userError || !userData) {
        error.value = 'ไม่พบข้อมูลผู้ใช้ในระบบ'
        await supabase.auth.signOut()
        isLoading.value = false
        return false
      }

      const userRecord = userData as { id: string; email: string; first_name?: string; last_name?: string; role?: string }
      
      if (userRecord.role !== 'admin' && userRecord.role !== 'super_admin') {
        error.value = 'บัญชีนี้ไม่มีสิทธิ์เข้าถึง Admin'
        await supabase.auth.signOut()
        isLoading.value = false
        return false
      }

      // Create admin user
      const role = (userRecord.role as AdminRole) || 'admin'
      const adminUser: AdminUser = {
        id: userRecord.id,
        email: userRecord.email,
        name: `${userRecord.first_name || ''} ${userRecord.last_name || ''}`.trim() || userRecord.email,
        role,
        permissions: DEFAULT_PERMISSIONS[role],
        created_at: new Date().toISOString()
      }

      saveSession(adminUser, authData.session?.access_token || 'admin_token', false)
      loginAttempts.value = 0
      isLocked.value = false
      isLoading.value = false
      return true

    } catch (e) {
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
    } catch {
      // Ignore errors
    }
  }

  // Initialize
  const initialize = async (): Promise<boolean> => {
    const hasSession = loadSession()
    
    if (!hasSession) {
      return false
    }

    // Verify Supabase session for non-demo mode
    if (!session.value?.isDemoMode) {
      try {
        const { data: { session: supaSession } } = await supabase.auth.getSession()
        if (!supaSession) {
          clearSession()
          return false
        }
      } catch {
        // Keep session if network error
      }
    }

    return true
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
