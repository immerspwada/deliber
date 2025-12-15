import { ref, onUnmounted } from 'vue'
import { supabase } from '../lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

// Global channels registry
const channels = new Map<string, RealtimeChannel>()

export function useRealtime() {
  const isConnected = ref(false)
  const activeChannels = ref<string[]>([])

  // Subscribe to table changes
  const subscribeToTable = <T>(
    table: string,
    callback: (payload: { eventType: string; new: T; old: T }) => void,
    filter?: { column: string; value: string }
  ) => {
    const channelName = filter 
      ? `${table}:${filter.column}:${filter.value}`
      : `${table}:all`

    // Reuse existing channel
    if (channels.has(channelName)) {
      return channels.get(channelName)!
    }

    const channelConfig: any = {
      event: '*',
      schema: 'public',
      table: table
    }

    if (filter) {
      channelConfig.filter = `${filter.column}=eq.${filter.value}`
    }

    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', channelConfig, (payload) => {
        callback({
          eventType: payload.eventType,
          new: payload.new as T,
          old: payload.old as T
        })
      })
      .subscribe((status) => {
        isConnected.value = status === 'SUBSCRIBED'
        if (status === 'SUBSCRIBED') {
          activeChannels.value.push(channelName)
        }
      })

    channels.set(channelName, channel)
    return channel
  }

  // Subscribe to ride updates
  const subscribeToRide = (
    rideId: string,
    callback: (ride: any) => void
  ) => {
    return subscribeToTable(
      'ride_requests',
      (payload) => {
        if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
          callback(payload.new)
        }
      },
      { column: 'id', value: rideId }
    )
  }

  // Subscribe to user's rides
  const subscribeToUserRides = (
    userId: string,
    callback: (payload: { eventType: string; ride: any }) => void
  ) => {
    return subscribeToTable(
      'ride_requests',
      (payload) => {
        callback({ eventType: payload.eventType, ride: payload.new })
      },
      { column: 'user_id', value: userId }
    )
  }

  // Subscribe to driver location
  const subscribeToDriverLocation = (
    providerId: string,
    callback: (location: { lat: number; lng: number }) => void
  ) => {
    return subscribeToTable(
      'service_providers',
      (payload) => {
        if (payload.new) {
          const provider = payload.new as any
          callback({
            lat: provider.current_lat,
            lng: provider.current_lng
          })
        }
      },
      { column: 'id', value: providerId }
    )
  }

  // Subscribe to chat messages
  const subscribeToChatMessages = (
    sessionId: string,
    callback: (message: any) => void
  ) => {
    return subscribeToTable(
      'chat_messages',
      (payload) => {
        if (payload.eventType === 'INSERT') {
          callback(payload.new)
        }
      },
      { column: 'session_id', value: sessionId }
    )
  }

  // Subscribe to notifications
  const subscribeToNotifications = (
    userId: string,
    callback: (notification: any) => void
  ) => {
    return subscribeToTable(
      'notifications',
      (payload) => {
        if (payload.eventType === 'INSERT') {
          callback(payload.new)
        }
      },
      { column: 'user_id', value: userId }
    )
  }

  // Subscribe to delivery updates
  const subscribeToDelivery = (
    deliveryId: string,
    callback: (delivery: any) => void
  ) => {
    return subscribeToTable(
      'delivery_requests',
      (payload) => {
        if (payload.eventType === 'UPDATE') {
          callback(payload.new)
        }
      },
      { column: 'id', value: deliveryId }
    )
  }

  // Unsubscribe from channel
  const unsubscribe = (channelName: string) => {
    const channel = channels.get(channelName)
    if (channel) {
      supabase.removeChannel(channel)
      channels.delete(channelName)
      activeChannels.value = activeChannels.value.filter(c => c !== channelName)
    }
  }

  // Unsubscribe from all channels
  const unsubscribeAll = () => {
    channels.forEach((channel) => {
      supabase.removeChannel(channel)
    })
    channels.clear()
    activeChannels.value = []
    isConnected.value = false
  }

  // Cleanup on unmount
  onUnmounted(() => {
    // Don't unsubscribe all - let other components keep their subscriptions
  })

  return {
    isConnected,
    activeChannels,
    subscribeToTable,
    subscribeToRide,
    subscribeToUserRides,
    subscribeToDriverLocation,
    subscribeToChatMessages,
    subscribeToNotifications,
    subscribeToDelivery,
    unsubscribe,
    unsubscribeAll
  }
}

// Singleton for global realtime state
let globalRealtimeInstance: ReturnType<typeof useRealtime> | null = null

export function useGlobalRealtime() {
  if (!globalRealtimeInstance) {
    globalRealtimeInstance = useRealtime()
  }
  return globalRealtimeInstance
}
