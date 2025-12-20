/**
 * useRealtimeSync - Real-time Synchronization Composable
 * Task: 13 - Implement real-time synchronization
 * Requirements: 1.3, 5.1, 5.2, 5.3, 5.6
 * 
 * Handles real-time synchronization across all roles:
 * - Provider notification on new requests
 * - Customer notification on status changes
 * - Admin real-time monitoring
 * - Offline queue for missed updates
 * - Reconnection sync logic
 */

import { ref, onUnmounted } from 'vue'
import { supabase } from '@/lib/supabase'
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { type ServiceType, getTableName, getAllServiceTypes } from '@/lib/serviceRegistry'

export interface RealtimeEvent {
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  table: string
  serviceType: ServiceType
  data: any
  timestamp: Date
}

export interface OfflineQueueItem {
  event: RealtimeEvent
  processed: boolean
  retryCount: number
}

type EventHandler = (event: RealtimeEvent) => void

export function useRealtimeSync() {
  const channels = ref<Map<string, RealtimeChannel>>(new Map())
  const isConnected = ref(true)
  const offlineQueue = ref<OfflineQueueItem[]>([])
  const eventHandlers = ref<Map<string, EventHandler[]>>(new Map())
  const lastSyncTime = ref<Date | null>(null)

  // Subscribe to service type changes
  function subscribeToService(
    serviceType: ServiceType,
    filter?: string,
    onEvent?: EventHandler
  ): void {
    const tableName = getTableName(serviceType)
    const channelName = filter ? `${serviceType}:${filter}` : serviceType

    // Avoid duplicate subscriptions
    if (channels.value.has(channelName)) return

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: tableName,
          ...(filter ? { filter } : {})
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          const event: RealtimeEvent = {
            type: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            table: tableName,
            serviceType,
            data: payload.new || payload.old,
            timestamp: new Date()
          }

          handleEvent(event)
          if (onEvent) onEvent(event)
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          isConnected.value = true
          processOfflineQueue()
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          isConnected.value = false
        }
      })

    channels.value.set(channelName, channel)
  }

  // Subscribe to all services (for admin)
  function subscribeToAllServices(onEvent?: EventHandler): void {
    for (const serviceType of getAllServiceTypes()) {
      subscribeToService(serviceType, undefined, onEvent)
    }
  }

  // Subscribe to provider location updates
  function subscribeToProviderLocations(onUpdate: (providerId: string, lat: number, lng: number) => void): void {
    const channel = supabase
      .channel('provider_locations')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'service_providers',
          filter: 'status=eq.available'
        },
        (payload) => {
          const { id, current_lat, current_lng } = payload.new as any
          if (current_lat && current_lng) {
            onUpdate(id, current_lat, current_lng)
          }
        }
      )
      .subscribe()

    channels.value.set('provider_locations', channel)
  }

  // Handle incoming event
  function handleEvent(event: RealtimeEvent): void {
    if (!isConnected.value) {
      // Queue for later processing
      offlineQueue.value.push({
        event,
        processed: false,
        retryCount: 0
      })
      return
    }

    // Notify all registered handlers
    const handlers = eventHandlers.value.get(event.serviceType) || []
    handlers.forEach(handler => handler(event))

    // Update last sync time
    lastSyncTime.value = new Date()
  }

  // Register event handler
  function onServiceEvent(serviceType: ServiceType, handler: EventHandler): () => void {
    const handlers = eventHandlers.value.get(serviceType) || []
    handlers.push(handler)
    eventHandlers.value.set(serviceType, handlers)

    // Return unsubscribe function
    return () => {
      const current = eventHandlers.value.get(serviceType) || []
      eventHandlers.value.set(serviceType, current.filter(h => h !== handler))
    }
  }

  // Process offline queue when reconnected
  async function processOfflineQueue(): Promise<void> {
    const pending = offlineQueue.value.filter(item => !item.processed)
    
    for (const item of pending) {
      try {
        handleEvent(item.event)
        item.processed = true
      } catch (error) {
        item.retryCount++
        if (item.retryCount >= 3) {
          item.processed = true // Give up after 3 retries
        }
      }
    }

    // Clean up processed items
    offlineQueue.value = offlineQueue.value.filter(item => !item.processed)
  }

  // Sync missed updates after reconnection
  async function syncMissedUpdates(serviceType: ServiceType, since: Date): Promise<any[]> {
    const tableName = getTableName(serviceType)
    
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .gte('updated_at', since.toISOString())
      .order('updated_at', { ascending: true })

    if (error) throw error
    return data || []
  }

  // Unsubscribe from a channel
  async function unsubscribe(channelName: string): Promise<void> {
    const channel = channels.value.get(channelName)
    if (channel) {
      await supabase.removeChannel(channel)
      channels.value.delete(channelName)
    }
  }

  // Unsubscribe from all channels
  async function unsubscribeAll(): Promise<void> {
    for (const [name, channel] of channels.value) {
      await supabase.removeChannel(channel)
    }
    channels.value.clear()
  }

  // Cleanup on unmount
  onUnmounted(() => {
    unsubscribeAll()
  })

  return {
    channels,
    isConnected,
    offlineQueue,
    lastSyncTime,
    subscribeToService,
    subscribeToAllServices,
    subscribeToProviderLocations,
    onServiceEvent,
    syncMissedUpdates,
    unsubscribe,
    unsubscribeAll
  }
}
