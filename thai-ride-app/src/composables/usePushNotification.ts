/**
 * Push Notification Composable - Production Ready
 * Web Push Notifications for new jobs with Service Worker integration
 * 
 * Role Impact:
 * - Provider: Receives job notifications even when app is closed
 * - Customer: No access
 * - Admin: Can send system announcements (future)
 */
import { ref, onMounted } from 'vue'
import { supabase } from '../lib/supabase'
import type { Job } from '../types/provider'

// VAPID public key from environment
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || ''

export function usePushNotification() {
  const isSupported = ref(false)
  const isSubscribed = ref(false)
  const permission = ref<NotificationPermission>('default')
  const loading = ref(false)
  const error = ref<string | null>(null)
  const subscription = ref<PushSubscription | null>(null)

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
      let sub = await registration.pushManager.getSubscription()
      
      if (sub) {
        subscription.value = sub
        isSubscribed.value = true
        // Save to database
        await saveSubscriptionToDatabase(sub)
        return sub
      }

      // Create new subscription
      if (!VAPID_PUBLIC_KEY) {
        console.warn('[Push] VAPID key not configured')
        error.value = 'Push notification not configured'
        return null
      }

      sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource
      })

      subscription.value = sub
      isSubscribed.value = true
      
      // Save subscription to database
      await saveSubscriptionToDatabase(sub)
      
      console.log('[Push] Subscribed:', sub.endpoint)
      
      return sub
    } catch (err) {
      console.error('[Push] Subscribe error:', err)
      error.value = 'ไม่สามารถสมัครรับการแจ้งเตือนได้'
      return null
    } finally {
      loading.value = false
    }
  }
  
  /**
   * Save subscription to database for server-side push
   */
  async function saveSubscriptionToDatabase(sub: PushSubscription): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      const { data: provider } = await supabase
        .from('providers_v2')
        .select('id')
        .eq('user_id', user.id)
        .single()
      
      if (!provider) return
      
      // Store subscription in database (you'll need to create this table)
      const subscriptionData = {
        provider_id: provider.id,
        endpoint: sub.endpoint,
        keys: JSON.stringify({
          p256dh: arrayBufferToBase64(await sub.getKey('p256dh')),
          auth: arrayBufferToBase64(await sub.getKey('auth'))
        }),
        updated_at: new Date().toISOString()
      }
      
      // Upsert subscription
      await supabase
        .from('push_subscriptions')
        .upsert(subscriptionData, { onConflict: 'provider_id' })
      
      console.log('[Push] Subscription saved to database')
    } catch (err) {
      console.warn('[Push] Failed to save subscription:', err)
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
  function notifyNewJob(job: Job): void {
    const serviceIcons: Record<string, string> = {
      ride: '🚗',
      delivery: '📦',
      shopping: '🛒',
      moving: '📦',
      laundry: '👕'
    }
    
    const icon = serviceIcons[job.service_type] || '🚗'
    const fare = job.estimated_earnings?.toLocaleString() || '0'
    
    showLocalNotification(`${icon} งานใหม่!`, {
      body: `฿${fare} - ${job.pickup_address || 'ไม่ระบุ'}`,
      data: { 
        jobId: job.id, 
        action: 'view_job',
        url: `/provider/jobs/${job.id}`
      },
      actions: [
        { action: 'accept', title: 'รับงาน' },
        { action: 'view', title: 'ดูรายละเอียด' }
      ],
      vibrate: [200, 100, 200],
      requireInteraction: true
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
  
  // Convert ArrayBuffer to Base64
  function arrayBufferToBase64(buffer: ArrayBuffer | null): string {
    if (!buffer) return ''
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return window.btoa(binary)
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
    subscription,
    requestPermission,
    subscribe,
    unsubscribe,
    showLocalNotification,
    notifyNewJob
  }
}
