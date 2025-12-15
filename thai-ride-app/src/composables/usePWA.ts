import { ref, computed, onMounted } from 'vue'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function usePWA() {
  const isInstalled = ref(false)
  const canInstall = ref(false)
  const isOnline = ref(navigator.onLine)
  const needsUpdate = ref(false)
  const swRegistration = ref<ServiceWorkerRegistration | null>(null)
  
  let deferredPrompt: BeforeInstallPromptEvent | null = null

  // Check if app is installed
  const checkInstalled = () => {
    isInstalled.value = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
  }

  // Handle install prompt
  const handleBeforeInstallPrompt = (e: Event) => {
    e.preventDefault()
    deferredPrompt = e as BeforeInstallPromptEvent
    canInstall.value = true
  }

  // Trigger install prompt
  const installApp = async (): Promise<boolean> => {
    if (!deferredPrompt) return false
    
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    
    if (outcome === 'accepted') {
      canInstall.value = false
      isInstalled.value = true
    }
    
    deferredPrompt = null
    return outcome === 'accepted'
  }


  // Handle online/offline status
  const handleOnline = () => { isOnline.value = true }
  const handleOffline = () => { isOnline.value = false }

  // Check for service worker updates
  const checkForUpdates = async () => {
    if (swRegistration.value) {
      await swRegistration.value.update()
    }
  }

  // Apply pending update
  const applyUpdate = () => {
    if (swRegistration.value?.waiting) {
      swRegistration.value.waiting.postMessage({ type: 'SKIP_WAITING' })
      needsUpdate.value = false
      window.location.reload()
    }
  }

  // Request notification permission
  const requestNotificationPermission = async (): Promise<boolean> => {
    if (!('Notification' in window)) return false
    
    if (Notification.permission === 'granted') return true
    if (Notification.permission === 'denied') return false
    
    const permission = await Notification.requestPermission()
    return permission === 'granted'
  }

  // Show local notification
  const showNotification = async (title: string, options?: NotificationOptions) => {
    const hasPermission = await requestNotificationPermission()
    if (!hasPermission || !swRegistration.value) return

    await swRegistration.value.showNotification(title, {
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      ...options
    })
  }

  // Subscribe to push notifications
  const subscribeToPush = async (vapidPublicKey: string) => {
    if (!swRegistration.value) return null
    
    const keyArray = urlBase64ToUint8Array(vapidPublicKey)
    const subscription = await swRegistration.value.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: keyArray as BufferSource
    })
    
    return subscription
  }

  // Helper to convert VAPID key
  function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
  }

  // Save data for offline use
  const saveOfflineData = async (key: string, data: any) => {
    try {
      localStorage.setItem(`offline_${key}`, JSON.stringify({
        data,
        timestamp: Date.now()
      }))
    } catch (e) {
      console.error('Failed to save offline data:', e)
    }
  }

  // Get offline data
  const getOfflineData = <T>(key: string, maxAge = 24 * 60 * 60 * 1000): T | null => {
    try {
      const stored = localStorage.getItem(`offline_${key}`)
      if (!stored) return null
      
      const { data, timestamp } = JSON.parse(stored)
      if (Date.now() - timestamp > maxAge) {
        localStorage.removeItem(`offline_${key}`)
        return null
      }
      return data as T
    } catch {
      return null
    }
  }

  // Queue action for background sync
  const queueOfflineAction = async (action: { type: string; payload: any }) => {
    const queue = JSON.parse(localStorage.getItem('offline_queue') || '[]')
    queue.push({ ...action, id: Date.now(), timestamp: Date.now() })
    localStorage.setItem('offline_queue', JSON.stringify(queue))
    
    if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
      const reg = await navigator.serviceWorker.ready
      await (reg as any).sync.register('sync-ride-request')
    }
  }

  const notificationPermission = computed(() => {
    if (!('Notification' in window)) return 'unsupported'
    return Notification.permission
  })


  // Initialize PWA features
  onMounted(() => {
    checkInstalled()
    
    // Listen for install prompt
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    
    // Listen for app installed
    window.addEventListener('appinstalled', () => {
      isInstalled.value = true
      canInstall.value = false
    })
    
    // Listen for online/offline
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    // Listen for display mode changes
    window.matchMedia('(display-mode: standalone)').addEventListener('change', checkInstalled)
    
    // Get service worker registration
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(reg => {
        swRegistration.value = reg
        
        // Check for updates
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing
          newWorker?.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              needsUpdate.value = true
            }
          })
        })
      })
      
      // Listen for controller change (update applied) - only reload once
      let refreshing = false
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return
        refreshing = true
        window.location.reload()
      })
    }
  })

  return {
    isInstalled,
    canInstall,
    isOnline,
    needsUpdate,
    notificationPermission,
    installApp,
    checkForUpdates,
    applyUpdate,
    requestNotificationPermission,
    showNotification,
    subscribeToPush,
    saveOfflineData,
    getOfflineData,
    queueOfflineAction
  }
}
