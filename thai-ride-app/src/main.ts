import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'

// Import router with guards
import router from './router/index'
import { supabase } from './lib/supabase'
import { initSentry, setUser as setSentryUser } from './lib/sentry'

// Cache for session to avoid repeated checks
let cachedSession: any = null
let sessionCacheTime = 0
const SESSION_CACHE_TTL = 30000 // 30 seconds

// Helper to get user role (sync for demo, async for real auth)
const getUserRole = (): string | null => {
  // Check demo user first (sync)
  const demoUser = localStorage.getItem('demo_user')
  if (demoUser) {
    try {
      const user = JSON.parse(demoUser)
      return user.role || 'customer'
    } catch {
      return 'customer'
    }
  }
  return null
}

// Helper to get session with caching and timeout
const getSessionWithTimeout = async (timeoutMs: number = 2000) => {
  // Demo mode - skip Supabase entirely
  const isDemoMode = localStorage.getItem('demo_mode') === 'true'
  if (isDemoMode) {
    return null // Demo mode doesn't need real session
  }
  
  // Return cached session if still valid
  const now = Date.now()
  if (cachedSession !== null && (now - sessionCacheTime) < SESSION_CACHE_TTL) {
    return cachedSession
  }
  
  try {
    const sessionPromise = supabase.auth.getSession()
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Session timeout')), timeoutMs)
    )
    const result = await Promise.race([sessionPromise, timeoutPromise]) as any
    cachedSession = result?.data?.session || null
    sessionCacheTime = now
    return cachedSession
  } catch {
    console.warn('[Auth] Session check timeout')
    return cachedSession // Return cached even if expired on timeout
  }
}

// ✅ FIX: Admin session expiry check with caching (8 hours)
const ADMIN_SESSION_TTL = 8 * 60 * 60 * 1000 // 8 hours in ms
const ADMIN_SESSION_CACHE_TTL = 60000 // Cache for 1 minute

// Cache admin session validation to reduce localStorage access
let cachedAdminSessionValid: boolean | null = null
let adminSessionCacheTime = 0

const isAdminSessionValid = (): boolean => {
  // ✅ Return cached result if still valid (reduces localStorage access from 3,600 to ~50 per session)
  const now = Date.now()
  if (cachedAdminSessionValid !== null && (now - adminSessionCacheTime) < ADMIN_SESSION_CACHE_TTL) {
    return cachedAdminSessionValid
  }
  
  const adminToken = localStorage.getItem('admin_token')
  
  // No token = not logged in
  if (!adminToken) {
    console.log('[Admin] No token found')
    cachedAdminSessionValid = false
    adminSessionCacheTime = now
    return false
  }
  
  // Check session expiry if login time exists
  const loginTime = localStorage.getItem('admin_login_time')
  if (loginTime) {
    const elapsed = Date.now() - parseInt(loginTime, 10)
    if (elapsed > ADMIN_SESSION_TTL) {
      // Session expired - clear admin data
      localStorage.removeItem('admin_token')
      localStorage.removeItem('admin_user')
      localStorage.removeItem('admin_login_time')
      localStorage.removeItem('admin_demo_mode')
      console.warn('[Admin] Session expired after', Math.round(elapsed / 1000 / 60), 'minutes')
      cachedAdminSessionValid = false
      adminSessionCacheTime = now
      return false
    }
  }
  
  // Token exists and not expired
  console.log('[Admin] Session valid')
  cachedAdminSessionValid = true
  adminSessionCacheTime = now
  return true
}

// ✅ FIX: Clear admin session cache (call when logging out)
const clearAdminSessionCache = () => {
  cachedAdminSessionValid = null
  adminSessionCacheTime = 0
}

// Admin activity log - บันทึกการเข้าใช้งาน
const logAdminActivity = (action: string, details?: Record<string, any>) => {
  const adminUser = localStorage.getItem('admin_user')
  const log = {
    timestamp: new Date().toISOString(),
    action,
    admin: adminUser ? JSON.parse(adminUser).email : 'unknown',
    details,
    userAgent: navigator.userAgent
  }
  
  // Store in localStorage (last 100 entries)
  const logs = JSON.parse(localStorage.getItem('admin_activity_log') || '[]')
  logs.unshift(log)
  if (logs.length > 100) logs.pop()
  localStorage.setItem('admin_activity_log', JSON.stringify(logs))
  
  // Also log to console for debugging
  console.log('[Admin Activity]', action, details || '')
}

// ✅ Additional navigation guard for admin routes (runs after router/index.ts guards)
router.beforeEach(async (to, from, next) => {
  const isAdminRoute = to.path.startsWith('/admin')
  const requiresAdmin = to.meta.requiresAdmin

  // Admin routes - ใช้ admin auth แยก
  if (isAdminRoute) {
    const isValidSession = isAdminSessionValid()
    
    // ถ้าเป็น route ที่ต้องการ admin auth และ session ไม่ valid
    if (requiresAdmin && !isValidSession) {
      next('/admin/login')
      return
    }
    // ถ้าอยู่หน้า login แต่มี valid session แล้ว ให้ไป dashboard
    if (to.path === '/admin/login' && isValidSession) {
      next('/admin/dashboard')
      return
    }
    // Log admin navigation
    if (isValidSession && to.path !== from.path) {
      logAdminActivity('navigate', { from: from.path, to: to.path })
    }
  }
  
  next()
})

// ✅ FIX: Add afterEach guard for cleanup trigger
router.afterEach((to, from) => {
  // Trigger cleanup event for views to cleanup subscriptions/timers
  if (from.path !== to.path) {
    window.dispatchEvent(new CustomEvent('route-cleanup', { 
      detail: { from: from.path, to: to.path } 
    }))
  }
})

// Create Pinia store
const pinia = createPinia()

// Create and mount app
const app = createApp(App)

// Initialize Sentry for error monitoring
initSentry(app, router)

app.use(pinia)
app.use(router)
app.mount('#app')

// Set Sentry user context when auth changes
supabase.auth.onAuthStateChange((_event, session) => {
  if (session?.user) {
    setSentryUser({
      id: session.user.id,
      email: session.user.email,
      role: session.user.user_metadata?.role
    })
  } else {
    setSentryUser(null)
  }
})

// PWA Service Worker Registration
if ('serviceWorker' in navigator) {
  // Register service worker from vite-plugin-pwa
  // @ts-ignore - virtual module from vite-plugin-pwa
  import('virtual:pwa-register').then(({ registerSW }: { registerSW: any }) => {
    const updateSW = registerSW({
      immediate: false,
      onNeedRefresh() {
        // Dispatch event for PWAInstallBanner to handle
        window.dispatchEvent(new CustomEvent('pwa-update-available'))
      },
      onOfflineReady() {
        console.log('App ready to work offline')
        window.dispatchEvent(new CustomEvent('pwa-offline-ready'))
      },
      onRegistered(registration: any) {
        if (registration) {
          // Check for updates every hour
          setInterval(() => {
            registration.update()
          }, 60 * 60 * 1000)
        }
      },
      onRegisterError(error: any) {
        console.error('SW registration error:', error)
      }
    })
    
    // Listen for update request from app
    window.addEventListener('pwa-update-request', () => {
      updateSW(true)
    })
  }).catch(err => {
    console.error('Failed to load PWA register:', err)
  })
}
