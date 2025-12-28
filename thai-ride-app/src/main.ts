import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import './styles/transitions.css'
// NO ANIMATIONS - กดปุ๊บ มาปั๊บ (must be imported LAST to override everything)
import './styles/no-animations.css'
import App from './App.vue'

// Import router with guards
import router from './router/index'
import { initSentry, setUser as setSentryUser } from './lib/sentry'

// Create Pinia store
const pinia = createPinia()

// Create and mount app
const app = createApp(App)

// Initialize Sentry for error monitoring
initSentry(app, router)

app.use(pinia)
app.use(router)

// ========================================
// IMPORTANT: Admin and Customer auth are COMPLETELY SEPARATE
// ========================================
// - Admin uses: adminAuth.store.ts (Demo Mode with localStorage session)
// - Customer uses: stores/auth.ts (Supabase Auth)
// 
// We DON'T initialize customer auth here anymore.
// App.vue handles initialization based on route type:
// - Admin routes (/admin/*) → Skip customer auth, use admin auth
// - Customer routes → Initialize customer auth
// ========================================

// Mount app immediately - auth initialization is handled by App.vue
app.mount('#app')

// Set Sentry user context when customer auth changes (lazy load to avoid admin routes)
// Only setup listener for non-admin routes
const setupCustomerAuthListener = async () => {
  const currentPath = window.location.pathname
  if (currentPath.startsWith('/admin')) {
    // Admin route - don't setup customer auth listener
    return
  }
  
  // Customer route - setup Supabase auth listener
  const { supabase } = await import('./lib/supabase')
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
}

// Setup listener after a small delay to ensure router is ready
setTimeout(setupCustomerAuthListener, 100)

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
