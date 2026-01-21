/**
 * useAdminRealtime - Admin Realtime Composable
 * Feature: F05 - Admin Realtime Notifications for Topup Requests
 * 
 * Provides realtime functionality for admin dashboard:
 * - Topup request notifications
 * - Live updates for admin views
 * - Cross-role event handling
 */
import { ref, onUnmounted } from 'vue'
import { supabase } from '../lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface AdminRealtimeOptions {
  onTopupRequestCreated?: (payload: any) => void
  onTopupRequestUpdated?: (payload: any) => void
  onTopupRequestDeleted?: (payload: any) => void
  onError?: (error: any) => void
}

export function useAdminRealtime(options: AdminRealtimeOptions = {}) {
  const channel = ref<RealtimeChannel | null>(null)
  const isConnected = ref(false)
  const error = ref<string | null>(null)

  const setupRealtimeSubscription = async () => {
    try {
      // Set auth for realtime
      await supabase.realtime.setAuth()
      
      // Create channel for admin topup notifications
      channel.value = supabase.channel('admin:topup_requests', {
        config: { private: true }
      })

      channel.value
        .on('broadcast', { event: 'topup_request_created' }, (payload) => {
          console.log('Admin: New topup request:', payload)
          options.onTopupRequestCreated?.(payload.payload)
        })
        .on('broadcast', { event: 'topup_request_updated' }, (payload) => {
          console.log('Admin: Topup request updated:', payload)
          options.onTopupRequestUpdated?.(payload.payload)
        })
        .on('broadcast', { event: 'topup_request_deleted' }, (payload) => {
          console.log('Admin: Topup request deleted:', payload)
          options.onTopupRequestDeleted?.(payload.payload)
        })
        .subscribe((status) => {
          console.log('Admin realtime subscription status:', status)
          
          if (status === 'SUBSCRIBED') {
            isConnected.value = true
            error.value = null
          } else if (status === 'CHANNEL_ERROR') {
            isConnected.value = false
            error.value = 'เกิดข้อผิดพลาดในการเชื่อมต่อ Realtime'
            options.onError?.(error.value)
          } else if (status === 'CLOSED') {
            isConnected.value = false
          }
        })
    } catch (err) {
      console.error('Error setting up admin realtime subscription:', err)
      error.value = 'ไม่สามารถเชื่อมต่อ Realtime ได้'
      options.onError?.(err)
    }
  }

  const disconnect = () => {
    if (channel.value) {
      supabase.removeChannel(channel.value)
      channel.value = null
      isConnected.value = false
    }
  }

  // Cleanup on unmount
  onUnmounted(() => {
    disconnect()
  })

  return {
    setupRealtimeSubscription,
    disconnect,
    isConnected,
    error,
    channel
  }
}

// Specific composable for topup requests
export function useAdminTopupRealtime() {
  const notifications = ref<any[]>([])
  const unreadCount = ref(0)

  const addNotification = (payload: any, type: 'created' | 'updated' | 'deleted') => {
    const notification = {
      id: Date.now(),
      type,
      payload,
      timestamp: new Date(),
      read: false
    }
    
    notifications.value.unshift(notification)
    unreadCount.value++
    
    // Keep only last 50 notifications
    if (notifications.value.length > 50) {
      notifications.value = notifications.value.slice(0, 50)
    }
  }

  const markAsRead = (notificationId: number) => {
    const notification = notifications.value.find(n => n.id === notificationId)
    if (notification && !notification.read) {
      notification.read = true
      unreadCount.value = Math.max(0, unreadCount.value - 1)
    }
  }

  const markAllAsRead = () => {
    notifications.value.forEach(n => n.read = true)
    unreadCount.value = 0
  }

  const clearNotifications = () => {
    notifications.value = []
    unreadCount.value = 0
  }

  const { setupRealtimeSubscription, disconnect, isConnected, error } = useAdminRealtime({
    onTopupRequestCreated: (payload) => {
      addNotification(payload, 'created')
    },
    onTopupRequestUpdated: (payload) => {
      addNotification(payload, 'updated')
    },
    onTopupRequestDeleted: (payload) => {
      addNotification(payload, 'deleted')
    }
  })

  return {
    setupRealtimeSubscription,
    disconnect,
    isConnected,
    error,
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotifications
  }
}