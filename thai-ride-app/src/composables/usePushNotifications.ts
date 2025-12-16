/**
 * usePushNotifications - Web Push Notifications Composable
 *
 * Feature: F07 - Push Notifications
 * Tables: push_subscriptions, push_notification_queue
 * Migration: 015_push_notifications.sql
 *
 * @syncs-with
 * - Admin: useAdmin.ts (ส่ง push notification แบบ broadcast)
 * - Provider: useProvider.ts (รับ push เมื่อมีงานใหม่)
 * - Customer: stores/ride.ts (รับ push เมื่อสถานะเปลี่ยน)
 * - Database: push_notification_queue → Edge Function → Web Push
 *
 * @push-events
 * - new_ride_request: งานใหม่สำหรับ Provider
 * - ride_status_update: สถานะเปลี่ยนสำหรับ Customer
 * - new_promo: โปรโมชั่นใหม่
 * - system_announcement: ประกาศจากระบบ
 */

import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'

interface PushSubscriptionKeys {
  p256dh: string
  auth: string
}

export function usePushNotifications() {
  const authStore = useAuthStore()
  const isSupported = ref('serviceWorker' in navigator && 'PushManager' in window)
  const isSubscribed = ref(false)
  const isLoading = ref(false)
  const permission = ref<NotificationPermission>('default')
  const vapidPublicKey = ref<string | null>(null)

  // Check current permission status
  const checkPermission = () => {
    if ('Notification' in window) {
      permission.value = Notification.permission
    }
  }

  // Get VAPID public key from Edge Function
  const getVapidPublicKey = async (): Promise<string | null> => {
    if (vapidPublicKey.value) return vapidPublicKey.value

    try {
      const { data, error } = await supabase.functions.invoke('send-push', {
        body: { action: 'get_vapid_public_key' }
      })

      if (error) throw error
      vapidPublicKey.value = data.publicKey
      return data.publicKey
    } catch (err) {
      console.error('Failed to get VAPID key:', err)
      // Fallback to env variable if available
      const envKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
      if (envKey) {
        vapidPublicKey.value = envKey
        return envKey
      }
      return null
    }
  }

  // Convert VAPID key to Uint8Array
  const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
  }

  // Get device type
  const getDeviceType = (): string => {
    const ua = navigator.userAgent
    if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet'
    if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) return 'mobile'
    return 'desktop'
  }

  // Subscribe to push notifications
  const subscribe = async (): Promise<boolean> => {
    if (!isSupported.value || !authStore.user?.id) return false

    isLoading.value = true
    try {
      // Request notification permission
      const permissionResult = await Notification.requestPermission()
      permission.value = permissionResult
      
      if (permissionResult !== 'granted') {
        console.log('Notification permission denied')
        return false
      }

      // Get VAPID key
      const publicKey = await getVapidPublicKey()
      if (!publicKey) {
        console.error('No VAPID public key available')
        return false
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource
      })

      // Extract keys
      const subJson = subscription.toJSON()
      const keys = subJson.keys as unknown as PushSubscriptionKeys

      // Save to database
      const { error } = await (supabase.rpc as any)('save_push_subscription', {
        p_user_id: authStore.user.id,
        p_endpoint: subscription.endpoint,
        p_p256dh: keys.p256dh,
        p_auth: keys.auth,
        p_user_agent: navigator.userAgent,
        p_device_type: getDeviceType()
      })

      if (error) throw error

      isSubscribed.value = true
      localStorage.setItem('push_subscribed', 'true')
      
      return true
    } catch (err) {
      console.error('Push subscription failed:', err)
      return false
    } finally {
      isLoading.value = false
    }
  }

  // Unsubscribe from push notifications
  const unsubscribe = async (): Promise<boolean> => {
    if (!isSupported.value || !authStore.user?.id) return false

    isLoading.value = true
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      if (subscription) {
        // Unsubscribe from browser
        await subscription.unsubscribe()

        // Remove from database
        await (supabase.rpc as any)('remove_push_subscription', {
          p_user_id: authStore.user.id,
          p_endpoint: subscription.endpoint
        })
      }

      isSubscribed.value = false
      localStorage.removeItem('push_subscribed')
      
      return true
    } catch (err) {
      console.error('Push unsubscribe failed:', err)
      return false
    } finally {
      isLoading.value = false
    }
  }

  // Check if already subscribed
  const checkSubscription = async (): Promise<boolean> => {
    if (!isSupported.value) return false

    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      isSubscribed.value = !!subscription
      return !!subscription
    } catch {
      return false
    }
  }

  // Send test notification
  const sendTestNotification = async (): Promise<boolean> => {
    if (!authStore.user?.id) return false

    try {
      const { error } = await supabase.functions.invoke('send-push', {
        body: {
          action: 'send_to_user',
          userId: authStore.user.id,
          payload: {
            title: 'ทดสอบการแจ้งเตือน',
            body: 'Push notification ทำงานปกติ!',
            icon: '/pwa-192x192.png',
            tag: 'test-notification',
            data: { test: true }
          }
        }
      })

      if (error) throw error
      return true
    } catch (err) {
      console.error('Test notification failed:', err)
      return false
    }
  }

  // Initialize
  const initialize = async () => {
    checkPermission()
    if (isSupported.value) {
      await checkSubscription()
    }
  }

  // Computed
  const canSubscribe = computed(() => 
    isSupported.value && permission.value !== 'denied' && !isSubscribed.value
  )

  const statusText = computed(() => {
    if (!isSupported.value) return 'ไม่รองรับ'
    if (permission.value === 'denied') return 'ถูกปฏิเสธ'
    if (isSubscribed.value) return 'เปิดใช้งาน'
    return 'ปิดอยู่'
  })

  return {
    // State
    isSupported,
    isSubscribed,
    isLoading,
    permission,
    canSubscribe,
    statusText,

    // Methods
    initialize,
    subscribe,
    unsubscribe,
    checkSubscription,
    sendTestNotification,
    getVapidPublicKey
  }
}
