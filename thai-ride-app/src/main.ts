import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import './style.css'
import App from './App.vue'

// Import routes
import { routes } from './router/index'
import { supabase } from './lib/supabase'

// Create router
const router = createRouter({
  history: createWebHistory(),
  routes
})

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

// Navigation guard - ตรวจสอบ authentication
router.beforeEach(async (to, _from, next) => {
  const isAdminRoute = to.path.startsWith('/admin')
  const requiresAdminAuth = to.meta.requiresAdminAuth
  const adminToken = localStorage.getItem('admin_token')

  // Admin routes - ใช้ admin auth แยก
  if (isAdminRoute) {
    if (requiresAdminAuth && !adminToken) {
      next('/admin/login')
    } else if (to.path === '/admin/login' && adminToken) {
      next('/admin')
    } else {
      next()
    }
    return
  }

  // User routes - ใช้ user auth
  const isDemoMode = localStorage.getItem('demo_mode') === 'true'
  
  // Fast path for demo mode - no async needed
  if (isDemoMode) {
    const role = getUserRole()
    const isPublicRoute = to.meta.public
    
    if (isPublicRoute && (to.path === '/login' || to.path === '/register')) {
      if (role === 'rider' || role === 'driver') {
        next('/provider')
      } else {
        next('/customer')
      }
    } else if (to.path === '/') {
      if (role === 'rider' || role === 'driver') {
        next('/provider')
      } else {
        next('/customer')
      }
    } else {
      next()
    }
    return
  }
  
  // Real auth path
  const session = await getSessionWithTimeout()
  const isAuthenticated = !!session
  const requiresAuth = to.meta.requiresAuth
  const isPublicRoute = to.meta.public

  if (requiresAuth && !isAuthenticated) {
    next('/login')
  } else if (isPublicRoute && isAuthenticated && (to.path === '/login' || to.path === '/register')) {
    next('/customer')
  } else if (to.path === '/' && isAuthenticated) {
    next('/customer')
  } else {
    next()
  }
})

// Create Pinia store
const pinia = createPinia()

// Create and mount app
const app = createApp(App)
app.use(pinia)
app.use(router)
app.mount('#app')

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
