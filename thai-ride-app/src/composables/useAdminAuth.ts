/**
 * Admin Authentication Composable
 * ================================
 * ระบบ Auth แยกสำหรับ Admin โดยเฉพาะ
 * - ไม่แชร์กับ User App
 * - มี Session Management แยก
 * - มี Rate Limiting และ Security
 */

import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'

// ========================================
// Types
// ========================================
export interface AdminUser {
  id: string
  email: string
  name: string
  role: 'admin' | 'super_admin'
  created_at: string
  last_login?: string
}

export interface AdminSession {
  token: string
  user: AdminUser
  loginTime: number
  expiresAt: number
}

export interface LoginAttempt {
  count: number
  lastAttempt: number
  lockedUntil: number | null
}

// ========================================
// Constants
// ========================================
const SESSION_TTL = 8 * 60 * 60 * 1000 // 8 hours
const SESSION_CACHE_TTL = 60000 // 1 minute cache
const MAX_LOGIN_ATTEMPTS = 5
const LOCKOUT_DURATION = 60000 // 1 minute
const REQUEST_TIMEOUT = 15000 // 15 seconds

// ========================================
// Storage Keys
// ========================================
const STORAGE_KEYS = {
  TOKEN: 'admin_token',
  USER: 'admin_user',
  LOGIN_TIME: 'admin_login_time',
  LOCKOUT: 'admin_lockout',
  ACTIVITY_LOG: 'admin_activity_log'
}

// ========================================
// Session Cache (reduces localStorage access)
// ========================================
let cachedSession: AdminSession | null = null
let sessionCacheTime = 0

// ========================================
// Composable
// ========================================
export function useAdminAuth() {
  const router = useRouter()
  
  // State
  const currentUser = ref<AdminUser | null>(null)
  const isAuthenticated = ref(false)
  const loading = ref(false)
  const error = ref('')
  const isOnline = ref(navigator.onLine)
  const loginAttempts = ref(0)
  const isLocked = ref(false)
  const lockoutEndTime = ref(0)
  const remainingLockTime = ref(0)
  
  // Timers
  let lockoutTimer: ReturnType<typeof setInterval> | null = null
  let sessionCheckTimer: ReturnType<typeof setInterval> | null = null

  // ========================================
  // Network Status
  // ========================================
  const handleOnline = () => { isOnline.value = true }
  const handleOffline = () => { isOnline.value = false }

  // ========================================
  // Activity Logging
  // ========================================
  const logActivity = (action: string, details?: Record<string, any>) => {
    try {
      const log = {
        timestamp: new Date().toISOString(),
        action,
        admin: currentUser.value?.email || details?.email || 'unknown',
        details,
        userAgent: navigator.userAgent
      }
      const logs = JSON.parse(localStorage.getItem(STORAGE_KEYS.ACTIVITY_LOG) || '[]')
      logs.unshift(log)
      if (logs.length > 100) logs.pop()
      localStorage.setItem(STORAGE_KEYS.ACTIVITY_LOG, JSON.stringify(logs))
    } catch {
      // Ignore logging errors
    }
  }

  // ========================================
  // Lockout Management
  // ========================================
  const checkLockout = () => {
    try {
      const storedLockout = localStorage.getItem(STORAGE_KEYS.LOCKOUT)
      if (storedLockout) {
        const lockoutData = JSON.parse(storedLockout)
        if (Date.now() < lockoutData.endTime) {
          isLocked.value = true
          lockoutEndTime.value = lockoutData.endTime
          loginAttempts.value = lockoutData.attempts
          startLockoutTimer()
        } else {
          clearLockout()
        }
      }
    } catch {
      clearLockout()
    }
  }

  const startLockoutTimer = () => {
    if (lockoutTimer) clearInterval(lockoutTimer)
    lockoutTimer = setInterval(() => {
      const remaining = Math.max(0, lockoutEndTime.value - Date.now())
      remainingLockTime.value = Math.ceil(remaining / 1000)
      if (remaining <= 0) {
        clearLockout()
      }
    }, 1000)
  }

  const clearLockout = () => {
    isLocked.value = false
    loginAttempts.value = 0
    lockoutEndTime.value = 0
    remainingLockTime.value = 0
    localStorage.removeItem(STORAGE_KEYS.LOCKOUT)
    if (lockoutTimer) {
      clearInterval(lockoutTimer)
      lockoutTimer = null
    }
  }

  const setLockout = () => {
    const endTime = Date.now() + LOCKOUT_DURATION
    isLocked.value = true
    lockoutEndTime.value = endTime
    localStorage.setItem(STORAGE_KEYS.LOCKOUT, JSON.stringify({
      endTime,
      attempts: loginAttempts.value
    }))
    startLockoutTimer()
  }

  // ========================================
  // Session Management
  // ========================================
  const getSession = (): AdminSession | null => {
    // Return cached if valid
    const now = Date.now()
    if (cachedSession && (now - sessionCacheTime) < SESSION_CACHE_TTL) {
      return cachedSession
    }

    try {
      const token = localStorage.getItem(STORAGE_KEYS.TOKEN)
      const userStr = localStorage.getItem(STORAGE_KEYS.USER)
      const loginTimeStr = localStorage.getItem(STORAGE_KEYS.LOGIN_TIME)

      if (!token || !userStr || !loginTimeStr) {
        cachedSession = null
        sessionCacheTime = now
        return null
      }

      const loginTime = parseInt(loginTimeStr)
      const expiresAt = loginTime + SESSION_TTL

      // Check expiry
      if (now > expiresAt) {
        clearSession()
        cachedSession = null
        sessionCacheTime = now
        return null
      }

      const user = JSON.parse(userStr) as AdminUser
      cachedSession = { token, user, loginTime, expiresAt }
      sessionCacheTime = now
      return cachedSession
    } catch {
      clearSession()
      cachedSession = null
      sessionCacheTime = now
      return null
    }
  }

  const setSession = (user: AdminUser, token: string) => {
    const now = Date.now()
    localStorage.setItem(STORAGE_KEYS.TOKEN, token)
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user))
    localStorage.setItem(STORAGE_KEYS.LOGIN_TIME, now.toString())

    // Update cache
    cachedSession = {
      token,
      user,
      loginTime: now,
      expiresAt: now + SESSION_TTL
    }
    sessionCacheTime = now

    // Update state
    currentUser.value = user
    isAuthenticated.value = true
  }

  const clearSession = () => {
    localStorage.removeItem(STORAGE_KEYS.TOKEN)
    localStorage.removeItem(STORAGE_KEYS.USER)
    localStorage.removeItem(STORAGE_KEYS.LOGIN_TIME)
    
    cachedSession = null
    sessionCacheTime = 0
    currentUser.value = null
    isAuthenticated.value = false
  }

  const isSessionValid = (): boolean => {
    const session = getSession()
    return session !== null
  }

  // ========================================
  // Initialize (check existing session)
  // ========================================
  const initialize = async (): Promise<boolean> => {
    const session = getSession()
    
    if (!session) {
      return false
    }

    currentUser.value = session.user
    isAuthenticated.value = true

    // Verify Supabase session
    try {
      const { data: { session: supaSession } } = await supabase.auth.getSession()
      if (!supaSession) {
        clearSession()
        return false
      }
    } catch {
      // Keep session if network error (offline support)
    }

    return true
  }

  // ========================================
  // Login
  // ========================================
  const login = async (email: string, password: string): Promise<boolean> => {
    // Validation
    const trimmedEmail = email.trim().toLowerCase()
    
    if (!trimmedEmail || !password) {
      error.value = 'กรุณากรอกอีเมลและรหัสผ่าน'
      return false
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(trimmedEmail)) {
      error.value = 'รูปแบบอีเมลไม่ถูกต้อง'
      return false
    }

    // Check lockout
    if (isLocked.value) {
      error.value = `กรุณารออีก ${remainingLockTime.value} วินาที`
      return false
    }

    // Check network
    if (!isOnline.value) {
      error.value = 'ไม่มีการเชื่อมต่ออินเทอร์เน็ต'
      return false
    }

    loading.value = true
    error.value = ''

    // Supabase login
    try {
      const loginPromise = supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password
      })

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('timeout')), REQUEST_TIMEOUT)
      })

      const { data: authData, error: authError } = await Promise.race([
        loginPromise,
        timeoutPromise
      ]) as any

      if (authError) {
        handleFailedLogin('อีเมลหรือรหัสผ่านไม่ถูกต้อง')
        return false
      }

      if (!authData?.user) {
        handleFailedLogin('ไม่พบข้อมูลผู้ใช้')
        return false
      }

      // Check admin role
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, email, first_name, last_name, role')
        .eq('id', authData.user.id)
        .single()

      if (userError || !userData) {
        handleFailedLogin('ไม่พบข้อมูลผู้ใช้ในระบบ')
        await supabase.auth.signOut()
        return false
      }

      if ((userData as any)?.role !== 'admin') {
        error.value = 'บัญชีนี้ไม่มีสิทธิ์เข้าถึง Admin'
        logActivity('unauthorized_access', { email: trimmedEmail })
        await supabase.auth.signOut()
        loading.value = false
        return false
      }

      // Success
      const adminUser: AdminUser = {
        id: (userData as any).id,
        email: (userData as any).email,
        name: `${(userData as any).first_name || ''} ${(userData as any).last_name || ''}`.trim() || (userData as any).email,
        role: 'admin',
        created_at: new Date().toISOString()
      }

      setSession(adminUser, authData.session?.access_token || 'admin_token')
      clearLockout()
      logActivity('login', { email: trimmedEmail })
      loading.value = false
      return true

    } catch (e: any) {
      if (e.message === 'timeout') {
        error.value = 'การเชื่อมต่อหมดเวลา กรุณาลองใหม่'
      } else if (e.message?.includes('fetch') || e.message?.includes('network')) {
        error.value = 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้'
      } else {
        error.value = 'เกิดข้อผิดพลาด กรุณาลองใหม่'
      }
      logActivity('login_error', { email: trimmedEmail, error: e.message })
      loading.value = false
      return false
    }
  }

  const handleFailedLogin = (message: string) => {
    loginAttempts.value++
    
    if (loginAttempts.value >= MAX_LOGIN_ATTEMPTS) {
      setLockout()
      error.value = `ล็อกอินผิดพลาดหลายครั้ง กรุณารอ ${Math.ceil(LOCKOUT_DURATION / 1000)} วินาที`
    } else {
      const remaining = MAX_LOGIN_ATTEMPTS - loginAttempts.value
      error.value = `${message} (เหลือ ${remaining} ครั้ง)`
    }
    
    logActivity('login_failed', { attempts: loginAttempts.value })
    loading.value = false
  }

  // ========================================
  // Logout
  // ========================================
  const logout = async (): Promise<void> => {
    logActivity('logout')
    
    // Clear session first (instant feedback)
    clearSession()
    
    // Sign out from Supabase (non-blocking)
    try {
      await Promise.race([
        supabase.auth.signOut(),
        new Promise(resolve => setTimeout(resolve, 2000))
      ])
    } catch {
      // Ignore errors
    }

    // Navigate to login
    router.push('/admin/login')
  }

  // ========================================
  // Session Check (periodic)
  // ========================================
  const startSessionCheck = () => {
    if (sessionCheckTimer) clearInterval(sessionCheckTimer)
    sessionCheckTimer = setInterval(() => {
      if (!isSessionValid()) {
        logout()
      }
    }, 60000) // Check every minute
  }

  const stopSessionCheck = () => {
    if (sessionCheckTimer) {
      clearInterval(sessionCheckTimer)
      sessionCheckTimer = null
    }
  }

  // ========================================
  // Lifecycle
  // ========================================
  onMounted(() => {
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    checkLockout()
  })

  onUnmounted(() => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
    if (lockoutTimer) clearInterval(lockoutTimer)
    stopSessionCheck()
  })

  // ========================================
  // Computed
  // ========================================
  const sessionTimeRemaining = computed(() => {
    const session = getSession()
    if (!session) return 0
    return Math.max(0, session.expiresAt - Date.now())
  })

  // ========================================
  // Return
  // ========================================
  return {
    // State
    currentUser,
    isAuthenticated,
    loading,
    error,
    isOnline,
    isLocked,
    remainingLockTime,
    loginAttempts,
    
    // Computed
    sessionTimeRemaining,
    
    // Methods
    initialize,
    login,
    logout,
    isSessionValid,
    getSession,
    clearSession,
    logActivity,
    startSessionCheck,
    stopSessionCheck,
    
    // Constants (for UI)
    MAX_LOGIN_ATTEMPTS,
    LOCKOUT_DURATION
  }
}

// ========================================
// Export singleton for router guards
// ========================================
const singletonInstance: ReturnType<typeof useAdminAuth> | null = null

export function getAdminAuthInstance() {
  // Create a minimal instance for router guards (doesn't need Vue reactivity)
  const SESSION_TTL_CONST = 8 * 60 * 60 * 1000 // 8 hours
  const SESSION_CACHE_TTL_CONST = 60000 // 1 minute
  
  let localCachedSession: AdminSession | null = null
  let localSessionCacheTime = 0

  const getSession = (): AdminSession | null => {
    const now = Date.now()
    if (localCachedSession && (now - localSessionCacheTime) < SESSION_CACHE_TTL_CONST) {
      return localCachedSession
    }

    try {
      const token = localStorage.getItem(STORAGE_KEYS.TOKEN)
      const userStr = localStorage.getItem(STORAGE_KEYS.USER)
      const loginTimeStr = localStorage.getItem(STORAGE_KEYS.LOGIN_TIME)

      if (!token || !userStr || !loginTimeStr) {
        localCachedSession = null
        localSessionCacheTime = now
        return null
      }

      const loginTime = parseInt(loginTimeStr)
      const expiresAt = loginTime + SESSION_TTL_CONST

      if (now > expiresAt) {
        localStorage.removeItem(STORAGE_KEYS.TOKEN)
        localStorage.removeItem(STORAGE_KEYS.USER)
        localStorage.removeItem(STORAGE_KEYS.LOGIN_TIME)
        localCachedSession = null
        localSessionCacheTime = now
        return null
      }

      const user = JSON.parse(userStr) as AdminUser
      localCachedSession = { token, user, loginTime, expiresAt }
      localSessionCacheTime = now
      return localCachedSession
    } catch {
      localCachedSession = null
      localSessionCacheTime = now
      return null
    }
  }

  return {
    isSessionValid: () => getSession() !== null,
    getSession,
    clearSessionCache: () => {
      localCachedSession = null
      localSessionCacheTime = 0
      // Also clear the module-level cache
      cachedSession = null
      sessionCacheTime = 0
    }
  }
}
