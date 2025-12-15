import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'
import { usePWA } from './usePWA'

export interface UserNotification {
  id: string
  type: 'promo' | 'ride' | 'system' | 'payment' | 'sos'
  title: string
  message: string
  data?: any
  is_read: boolean
  created_at: string
}

export function useNotifications() {
  const authStore = useAuthStore()
  const { showNotification: showPushNotification, requestNotificationPermission } = usePWA()
  const notifications = ref<UserNotification[]>([])
  const loading = ref(false)

  const unreadCount = computed(() => 
    notifications.value.filter(n => !n.is_read).length
  )

  // Fetch notifications
  const fetchNotifications = async (limit = 50) => {
    if (!authStore.user?.id) {
      // Demo notifications
      notifications.value = [
        {
          id: '1',
          type: 'promo',
          title: 'โปรโมชั่นพิเศษ',
          message: 'รับส่วนลด 50 บาท ใช้โค้ด FIRST50',
          is_read: false,
          created_at: new Date().toISOString()
        },
        {
          id: '2',
          type: 'system',
          title: 'ยินดีต้อนรับ',
          message: 'ขอบคุณที่ใช้บริการ Thai Ride App',
          is_read: true,
          created_at: new Date(Date.now() - 86400000).toISOString()
        }
      ]
      return notifications.value
    }

    loading.value = true
    try {
      const { data, error } = await (supabase
        .from('user_notifications') as any)
        .select('*')
        .eq('user_id', authStore.user.id)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (!error) {
        notifications.value = data || []
      }
      return data || []
    } catch (err) {
      console.error('Error fetching notifications:', err)
      return []
    } finally {
      loading.value = false
    }
  }

  // Mark as read
  const markAsRead = async (id: string) => {
    const notification = notifications.value.find(n => n.id === id)
    if (notification) {
      notification.is_read = true
    }

    if (!authStore.user?.id) return

    await (supabase
      .from('user_notifications') as any)
      .update({ is_read: true })
      .eq('id', id)
  }

  // Mark all as read
  const markAllAsRead = async () => {
    notifications.value.forEach(n => n.is_read = true)

    if (!authStore.user?.id) return

    await (supabase
      .from('user_notifications') as any)
      .update({ is_read: true })
      .eq('user_id', authStore.user.id)
      .eq('is_read', false)
  }

  // Delete notification
  const deleteNotification = async (id: string) => {
    notifications.value = notifications.value.filter(n => n.id !== id)

    if (!authStore.user?.id) return

    await (supabase
      .from('user_notifications') as any)
      .delete()
      .eq('id', id)
  }

  // Subscribe to new notifications (realtime)
  const subscribeToNotifications = (callback: (notification: UserNotification) => void) => {
    // Demo mode - simulate notifications
    if (!authStore.user?.id || authStore.isDemoMode) {
      // Simulate a welcome notification after 3 seconds
      const timeout = setTimeout(() => {
        const demoNotification: UserNotification = {
          id: `demo-${Date.now()}`,
          type: 'system',
          title: 'ยินดีต้อนรับ',
          message: 'ขอบคุณที่ใช้บริการ ThaiRide',
          is_read: false,
          created_at: new Date().toISOString()
        }
        notifications.value.unshift(demoNotification)
        callback(demoNotification)
        // Show push notification
        showPushNotification(demoNotification.title, {
          body: demoNotification.message,
          tag: demoNotification.id
        })
      }, 3000)
      
      return { unsubscribe: () => clearTimeout(timeout) }
    }

    return supabase
      .channel(`notifications:${authStore.user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${authStore.user.id}`
        },
        (payload) => {
          const newNotification = payload.new as UserNotification
          notifications.value.unshift(newNotification)
          callback(newNotification)
          // Show push notification
          showPushNotification(newNotification.title, {
            body: newNotification.message,
            tag: newNotification.id,
            data: { url: getNotificationUrl(newNotification) }
          })
        }
      )
      .subscribe()
  }

  // Get URL for notification click
  const getNotificationUrl = (notification: UserNotification): string => {
    switch (notification.type) {
      case 'ride': return '/history'
      case 'promo': return '/promotions'
      case 'payment': return '/wallet'
      case 'sos': return '/help'
      default: return '/notifications'
    }
  }

  // Enable push notifications
  const enablePushNotifications = async () => {
    return await requestNotificationPermission()
  }

  return {
    notifications,
    loading,
    unreadCount,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    subscribeToNotifications,
    enablePushNotifications,
    getNotificationUrl
  }
}
