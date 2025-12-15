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

// Helper to get user role
const getUserRole = async (): Promise<string | null> => {
  // Check demo user first
  const demoUser = localStorage.getItem('demo_user')
  if (demoUser) {
    try {
      const user = JSON.parse(demoUser)
      return user.role || 'customer'
    } catch {
      return 'customer'
    }
  }
  
  // Check Supabase session
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.user) {
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single()
    return (userData as any)?.role || 'customer'
  }
  
  return null
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
  const { data: { session } } = await supabase.auth.getSession()

  const isAuthenticated = !!session || isDemoMode
  const requiresAuth = to.meta.requiresAuth
  const isPublicRoute = to.meta.public

  if (requiresAuth && !isAuthenticated) {
    next('/login')
  } else if (isPublicRoute && isAuthenticated && (to.path === '/login' || to.path === '/register')) {
    // Redirect based on role after login
    const role = await getUserRole()
    if (role === 'rider' || role === 'driver') {
      next('/provider')
    } else {
      next('/')
    }
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

// PWA Service Worker - handled by vite-plugin-pwa (auto-registered via registerSW.js)
