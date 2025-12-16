import { ref, computed, onMounted, onUnmounted } from 'vue'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface PWAUpdateInfo {
  version?: string
  timestamp: number
}

export function usePWA() {
  const isInstalled = ref(false)
  const canInstall = ref(false)
  const isOnline = ref(navigator.onLine)
  const needsUpdate = ref(false)
  const isUpdating = ref(false)
  const swRegistration = ref<ServiceWorkerRegistration | null>(null)
  const cacheSize = ref<number>(0)
  const lastSyncTime = ref<number | null>(null)
  
  let deferredPrompt: BeforeInstallPromptEvent | null = null

  // Check if app is installed
  const checkInstalled = () => {
    isInstalled.value = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://')
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
    
    try {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      
      if (outcome === 'accepted') {
        canInstall.value = false
        isInstalled.value = true
        // Track installation
        localStorage.setItem('pwa_installed', Date.now().toString())
      }
      
      deferredPrompt = null
      return outcome === 'accepted'
    } catch (error) {
      console.error('Install prompt failed:', error)
      return false
    }
  }

  // Handle online/offline status
  const handleOnline = () => { 
    isOnline.value = true
    // Sync pending actions when back online
    syncPendingActions()
  }
  const handleOffline = () => { isOnline.value = false }

  // Check for service worker updates
  const checkForUpdates = async (): Promise<boolean> => {
    if (!swRegistration.value) return false
    
    try {
      await swRegistration.value.update()
      return needsUpdate.value
    } catch (error) {
      console.error('Update check failed:', error)
      return false
    }
  }

  // Apply pending update
  const applyUpdate = async () => {
    if (!swRegistration.value?.waiting) return
    
    isUpdating.value = true
    
    // Tell waiting SW to skip waiting
    swRegistration.value.waiting.postMessage({ type: 'SKIP_WAITING' })
    
    // Store update info
    const updateInfo: PWAUpdateInfo = {
      timestamp: Date.now()
    }
    localStorage.setItem('pwa_last_update', JSON.stringify(updateInfo))
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
    if (!hasPermission) return false

    // Use service worker notification if available
    if (swRegistration.value) {
      await swRegistration.value.showNotification(title, {
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        tag: options?.tag || 'default',
        renotify: true,
        ...options
      } as NotificationOptions)
      return true
    }
    
    // Fallback to regular notification
    new Notification(title, {
      icon: '/pwa-192x192.png',
      ...options
    })
    return true
  }

  // Subscribe to push notifications
  const subscribeToPush = async (vapidPublicKey: string) => {
    if (!swRegistration.value) return null
    
    try {
      const keyArray = urlBase64ToUint8Array(vapidPublicKey)
      const subscription = await swRegistration.value.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: keyArray as BufferSource
      })
      
      return subscription
    } catch (error) {
      console.error('Push subscription failed:', error)
      return null
    }
  }

  // Unsubscribe from push
  const unsubscribeFromPush = async (): Promise<boolean> => {
    if (!swRegistration.value) return false
    
    try {
      const subscription = await swRegistration.value.pushManager.getSubscription()
      if (subscription) {
        await subscription.unsubscribe()
        return true
      }
      return false
    } catch (error) {
      console.error('Push unsubscribe failed:', error)
      return false
    }
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
      const stored = {
        data,
        timestamp: Date.now(),
        version: 1
      }
      localStorage.setItem(`offline_${key}`, JSON.stringify(stored))
      return true
    } catch (e) {
      console.error('Failed to save offline data:', e)
      // Try to clear old data if storage is full
      clearOldOfflineData()
      return false
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

  // Clear old offline data
  const clearOldOfflineData = (maxAge = 7 * 24 * 60 * 60 * 1000) => {
    const keysToRemove: string[] = []
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('offline_')) {
        try {
          const stored = localStorage.getItem(key)
          if (stored) {
            const { timestamp } = JSON.parse(stored)
            if (Date.now() - timestamp > maxAge) {
              keysToRemove.push(key)
            }
          }
        } catch {
          keysToRemove.push(key)
        }
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key))
  }

  // Queue action for background sync
  const queueOfflineAction = async (action: { type: string; payload: any; endpoint?: string }) => {
    const queue = JSON.parse(localStorage.getItem('offline_queue') || '[]')
    queue.push({ 
      ...action, 
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retries: 0
    })
    localStorage.setItem('offline_queue', JSON.stringify(queue))
    
    // Register background sync if available
    if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
      try {
        const reg = await navigator.serviceWorker.ready
        await (reg as any).sync.register('sync-offline-actions')
      } catch (error) {
        console.error('Background sync registration failed:', error)
      }
    }
    
    return true
  }

  // Get pending offline actions
  const getPendingActions = () => {
    try {
      return JSON.parse(localStorage.getItem('offline_queue') || '[]')
    } catch {
      return []
    }
  }

  // Sync pending actions when online
  const syncPendingActions = async () => {
    if (!isOnline.value) return
    
    const queue = getPendingActions()
    if (queue.length === 0) return
    
    const processed: string[] = []
    
    for (const action of queue) {
      try {
        // Emit event for app to handle
        window.dispatchEvent(new CustomEvent('pwa-sync-action', { detail: action }))
        processed.push(action.id)
      } catch (error) {
        console.error('Failed to sync action:', action, error)
        // Increment retry count
        action.retries = (action.retries || 0) + 1
      }
    }
    
    // Remove processed actions
    const remaining = queue.filter((a: any) => !processed.includes(a.id) && a.retries < 3)
    localStorage.setItem('offline_queue', JSON.stringify(remaining))
    
    lastSyncTime.value = Date.now()
  }

  // Clear all caches
  const clearAllCaches = async () => {
    if ('caches' in window) {
      const cacheNames = await caches.keys()
      await Promise.all(cacheNames.map(name => caches.delete(name)))
      cacheSize.value = 0
      return true
    }
    return false
  }

  // Get cache storage estimate
  const getCacheSize = async () => {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate()
      cacheSize.value = estimate.usage || 0
      return {
        used: estimate.usage || 0,
        quota: estimate.quota || 0,
        percent: estimate.quota ? Math.round(((estimate.usage || 0) / estimate.quota) * 100) : 0
      }
    }
    return { used: 0, quota: 0, percent: 0 }
  }

  // Request persistent storage
  const requestPersistentStorage = async (): Promise<boolean> => {
    if ('storage' in navigator && 'persist' in navigator.storage) {
      const isPersisted = await navigator.storage.persist()
      return isPersisted
    }
    return false
  }

  // Check if storage is persistent
  const isStoragePersistent = async (): Promise<boolean> => {
    if ('storage' in navigator && 'persisted' in navigator.storage) {
      return await navigator.storage.persisted()
    }
    return false
  }

  // Share content (Web Share API)
  const shareContent = async (data: ShareData): Promise<boolean> => {
    if ('share' in navigator) {
      try {
        await navigator.share(data)
        return true
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('Share failed:', error)
        }
        return false
      }
    }
    return false
  }

  // Check if can share
  const canShare = (data?: ShareData): boolean => {
    if (!('share' in navigator)) return false
    if (data && 'canShare' in navigator) {
      return navigator.canShare(data)
    }
    return true
  }

  // Vibrate device
  const vibrate = (pattern: number | number[] = 100) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern)
    }
  }

  // Wake lock (keep screen on)
  let wakeLock: any = null
  
  const requestWakeLock = async (): Promise<boolean> => {
    if ('wakeLock' in navigator) {
      try {
        wakeLock = await (navigator as any).wakeLock.request('screen')
        return true
      } catch (error) {
        console.error('Wake lock failed:', error)
        return false
      }
    }
    return false
  }

  const releaseWakeLock = () => {
    if (wakeLock) {
      wakeLock.release()
      wakeLock = null
    }
  }

  const notificationPermission = computed(() => {
    if (!('Notification' in window)) return 'unsupported'
    return Notification.permission
  })

  const pendingActionsCount = computed(() => getPendingActions().length)

  // Cleanup function
  const cleanup = () => {
    window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
    releaseWakeLock()
  }

  // Initialize PWA features
  onMounted(() => {
    checkInstalled()
    getCacheSize()
    
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
        
        // Check for updates periodically
        setInterval(() => checkForUpdates(), 60 * 60 * 1000) // Every hour
        
        // Check for updates on visibility change
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            checkForUpdates()
          }
        })
        
        // Listen for update found
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing
          newWorker?.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              needsUpdate.value = true
            }
          })
        })
      })
      
      // Listen for controller change (update applied)
      let refreshing = false
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return
        refreshing = true
        window.location.reload()
      })
    }
    
    // Clear old offline data on startup
    clearOldOfflineData()
  })

  onUnmounted(() => {
    cleanup()
  })

  return {
    // State
    isInstalled,
    canInstall,
    isOnline,
    needsUpdate,
    isUpdating,
    cacheSize,
    lastSyncTime,
    notificationPermission,
    pendingActionsCount,
    
    // Install
    installApp,
    
    // Updates
    checkForUpdates,
    applyUpdate,
    
    // Notifications
    requestNotificationPermission,
    showNotification,
    subscribeToPush,
    unsubscribeFromPush,
    
    // Offline data
    saveOfflineData,
    getOfflineData,
    clearOldOfflineData,
    queueOfflineAction,
    getPendingActions,
    syncPendingActions,
    
    // Cache management
    clearAllCaches,
    getCacheSize,
    requestPersistentStorage,
    isStoragePersistent,
    
    // Web APIs
    shareContent,
    canShare,
    vibrate,
    requestWakeLock,
    releaseWakeLock
  }
}
