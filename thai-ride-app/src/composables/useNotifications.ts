/**
 * useNotifications - In-App Notifications Composable
 *
 * Feature: F07 - Notifications
 * Tables: user_notifications
 *
 * @syncs-with
 * - Admin: useAdmin.ts (ส่ง notification ถึง users)
 * - Provider: useProvider.ts (รับแจ้งเตือนงานใหม่/ยกเลิก)
 * - Customer: stores/ride.ts (รับแจ้งเตือนสถานะ)
 * - Database: Realtime subscription on user_notifications
 *
 * @notification-types
 * - promo: โปรโมชั่นใหม่
 * - ride/delivery/shopping: สถานะออเดอร์
 * - payment: การชำระเงิน/คืนเงิน
 * - system: ประกาศจากระบบ
 * - rating: แจ้งเตือนให้คะแนน
 */

import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'
import { usePWA } from './usePWA'

export interface UserNotification {
  id: string
  type: 'promo' | 'ride' | 'delivery' | 'shopping' | 'payment' | 'system' | 'sos' | 'referral' | 'subscription' | 'rating'
  title: string
  message: string
  data?: any
  is_read: boolean
  action_url?: string
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

  // Fetch notifications from database
  const fetchNotifications = async (limit = 50) => {
    if (!authStore.user?.id) {
      notifications.value = []
      return []
    }

    loading.value = true
    try {
      const { data, error } = await supabase
        .from('user_notifications')
        .select('*')
        .eq('user_id', authStore.user.id)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (!error && data) {
        notifications.value = data as UserNotification[]
      }
      return notifications.value
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

    await supabase
      .from('user_notifications')
      .delete()
      .eq('id', id)
  }

  // Subscribe to new notifications (realtime)
  const subscribeToNotifications = (callback: (notification: UserNotification) => void) => {
    if (!authStore.user?.id) {
      return { unsubscribe: () => {} }
    }

    return supabase
      .channel(`notifications:${authStore.user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_notifications',
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
    if (notification.action_url) return notification.action_url
    switch (notification.type) {
      case 'ride': return '/history'
      case 'delivery': return '/history'
      case 'shopping': return '/history'
      case 'rating': return '/history'
      case 'promo': return '/promotions'
      case 'payment': return '/wallet'
      case 'referral': return '/referral'
      case 'subscription': return '/subscription'
      case 'sos': return '/help'
      default: return '/notifications'
    }
  }

  // Send rating reminder notification
  const sendRatingReminder = async (params: {
    serviceType: 'ride' | 'delivery' | 'shopping'
    serviceId: string
    providerName: string
  }) => {
    if (!authStore.user?.id) return null

    const titles: Record<string, string> = {
      ride: 'ให้คะแนนการเดินทาง',
      delivery: 'ให้คะแนนการส่งของ',
      shopping: 'ให้คะแนนบริการซื้อของ'
    }

    const messages: Record<string, string> = {
      ride: `คุณพอใจกับบริการของ ${params.providerName} หรือไม่? แตะเพื่อให้คะแนน`,
      delivery: `พัสดุถึงแล้ว! ให้คะแนน ${params.providerName} เพื่อช่วยปรับปรุงบริการ`,
      shopping: `ของถึงแล้ว! ให้คะแนน ${params.providerName} เพื่อช่วยปรับปรุงบริการ`
    }

    try {
      const { data, error } = await supabase.rpc('send_notification', {
        p_user_id: authStore.user.id,
        p_type: 'rating',
        p_title: titles[params.serviceType],
        p_message: messages[params.serviceType],
        p_data: { 
          service_type: params.serviceType, 
          service_id: params.serviceId,
          provider_name: params.providerName
        },
        p_action_url: '/history'
      } as any)

      if (error) throw error
      return data
    } catch (err) {
      console.error('Error sending rating reminder:', err)
      return null
    }
  }

  // Enable push notifications
  const enablePushNotifications = async () => {
    return await requestNotificationPermission()
  }

  // Get notification icon
  const getNotificationIcon = (type: string): string => {
    switch (type) {
      case 'promo': return 'M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7'
      case 'ride': return 'M8 17h.01M16 17h.01M9 11h6M5 11l1.5-4.5A2 2 0 018.4 5h7.2a2 2 0 011.9 1.5L19 11M5 11v6a1 1 0 001 1h1a1 1 0 001-1v-1h8v1a1 1 0 001 1h1a1 1 0 001-1v-6M5 11h14'
      case 'delivery': return 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4'
      case 'shopping': return 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z'
      case 'payment': return 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z'
      case 'referral': return 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z'
      case 'sos': return 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
      case 'rating': return 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z'
      default: return 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9'
    }
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
    sendRatingReminder,
    getNotificationUrl,
    getNotificationIcon
  }
}
