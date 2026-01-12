/**
 * Push Notification Composable
 * Web Push Notifications for new jobs
 */
import { ref, onMounted } from 'vue'

// VAPID public key from environment
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || ''

export function usePushNotification() {
  const isSupported = ref(false)
  const isSubscribed = ref(false)
  const permission = ref<NotificationPermission>('default')
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Check if push notifications are supported
  function checkSupport(): boolean {
    const supported = 'serviceWorker' in navigator && 
                     'PushManager' in window && 
                     'Notification' in window
    isSupported.value = supported
    return supported
  }

  // Request notification permission
  async function requestPermission(): Promise<boolean> {
    if (!checkSupport()) {
      error.value = 'Push notifications not supported'
      return false
    }

    loading.value = true
    error.value = null

    try {
      const result = await Notification.requestPermission()
      permission.value = result
      
      if (result === 'granted') {
        await subscribe()
        return true
      } else if (result === 'denied') {
        error.value = 'การแจ้งเตือนถูกปิดกั้น กรุณาเปิดในการตั้งค่าเบราว์เซอร์'
        return false
      }
      
      return false
    } catch (err) {
      console.error('[Push] Permission error:', err)
      error.value = 'ไม่สามารถขอสิทธิ์การแจ้งเตือนได้'
      return false
    } finally {
      loading.value = false
    }
  }

  // Subscribe to push notifications
  async function subscribe(): Promise<PushSubscription | null> {
    if (!checkSupport()) return null

    loading.value = true
    error.value = null

    try {
      const registration = await navigator.serviceWorker.ready

      // Check existing subscription
      let subscription = await registration.pushManager.getSubscription()
      
      if (subscription) {
        isSubscribed.value = true
        return subscription
      }

      // Create new subscription
      if (!VAPID_PUBLIC_KEY) {
        console.warn('[Push] VAPID key not configured')
        error.value = 'Push notification not configured'
        return null
      }

      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource
      })

      isSubscribed.value = true
      
      // TODO: Send subscription to server
      console.log('[Push] Subscribed:', subscription.endpoint)
      
      return subscription
    } catch (err) {
      console.error('[Push] Subscribe error:', err)
      error.value = 'ไม่สามารถสมัครรับการแจ้งเตือนได้'
      return null
    } finally {
      loading.value = false
    }
  }

  // Unsubscribe from push notifications
  async function unsubscribe(): Promise<boolean> {
    loading.value = true
    error.value = null

    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      if (subscription) {
        await subscription.unsubscribe()
        isSubscribed.value = false
        
        // TODO: Remove subscription from server
        console.log('[Push] Unsubscribed')
        return true
      }

      return false
    } catch (err) {
      console.error('[Push] Unsubscribe error:', err)
      error.value = 'ไม่สามารถยกเลิกการแจ้งเตือนได้'
      return false
    } finally {
      loading.value = false
    }
  }

  // Show local notification (for testing)
  function showLocalNotification(title: string, options?: NotificationOptions): void {
    if (permission.value !== 'granted') {
      console.warn('[Push] Permission not granted')
      return
    }

    const defaultOptions: NotificationOptions = {
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: 'job-notification',
      requireInteraction: true,
      ...options
    }

    navigator.serviceWorker.ready.then(registration => {
      registration.showNotification(title, defaultOptions)
    })
  }

  // Show new job notification
  function notifyNewJob(job: {
    id: string
    type: string
    pickup: string
    fare: number
  }): void {
    showLocalNotification('🔔 งานใหม่!', {
      body: `${job.type} - ฿${job.fare.toLocaleString()}\n📍 ${job.pickup}`,
      data: { jobId: job.id, action: 'view_job' }
    })
  }

  // Convert VAPID key
  function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4)
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/')

    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
  }

  // Check current status on mount
  onMounted(async () => {
    checkSupport()
    
    if (isSupported.value) {
      permission.value = Notification.permission
      
      if (permission.value === 'granted') {
        const registration = await navigator.serviceWorker.ready
        const subscription = await registration.pushManager.getSubscription()
        isSubscribed.value = !!subscription
      }
    }
  })

  return {
    isSupported,
    isSubscribed,
    permission,
    loading,
    error,
    requestPermission,
    subscribe,
    unsubscribe,
    showLocalNotification,
    notifyNewJob
  }
}
