import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import './styles/transitions.css'
import App from './App.vue'

// Import router with guards
import router from './router/index'
import { supabase } from './lib/supabase'
import { initSentry, setUser as setSentryUser } from './lib/sentry'

// Create Pinia store
const pinia = createPinia()

// Create and mount app
const app = createApp(App)

// Initialize Sentry for error monitoring
initSentry(app, router)

app.use(pinia)
app.use(router)

// Initialize auth store before mounting
import { useAuthStore } from './stores/auth'
const authStore = useAuthStore()

// Initialize auth and then mount app
authStore.initialize().finally(() => {
  app.mount('#app')
})

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
