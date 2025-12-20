/**
 * useCrossRoleSync - Cross-Role Synchronization Composable
 * F175 - Unified Real-time Sync Across All Roles
 * 
 * ระบบ Sync ข้อมูลแบบ Real-time ที่ทำงานร่วมกันทุก Role
 * - Customer: ติดตามสถานะ request และตำแหน่ง provider
 * - Provider: รับงานใหม่และ sync สถานะ
 * - Admin: Monitor ทุกอย่างแบบ real-time
 */

import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { supabase } from '@/lib/supabase'
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { 
  eventBus, 
  useCrossRoleEvents, 
  CrossRoleEvents,
  type UserRole,
  type CrossRoleEvent
} from '@/lib/crossRoleEventBus'
import { 
  type ServiceType, 
  type RequestStatus,
  getAllServiceTypes,
  getTableName 
} from '@/lib/serviceRegistry'
import { useAuthStore } from '@/stores/auth'

export interface SyncConfig {
  role: UserRole
  serviceTypes?: ServiceType[]
  requestIds?: string[]
  providerId?: string
  customerId?: string
  enableLocationSync?: boolean
  enableNotifications?: boolean
}

export interface SyncStats {
  eventsReceived: number
  lastEventTime: string | null
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting'
  latency: number
}

export function useCrossRoleSync(config: SyncConfig) {
  const authStore = useAuthStore()
  const { subscribe, emit, setContext } = useCrossRoleEvents()
  
  // State
  const isConnected = ref(false)
  const channels = ref<RealtimeChannel[]>([])
  const syncStats = ref<SyncStats>({
    eventsReceived: 0,
    lastEventTime: null,
    connectionStatus: 'disconnected',
    latency: 0
  })
  const pendingUpdates = ref<Map<string, any>>(new Map())
  const locationUpdateInterval = ref<number | null>(null)

  // Computed
  const serviceTypes = computed(() => config.serviceTypes || getAllServiceTypes())

  // Initialize sync
  async function initialize(): Promise<void> {
    const user = authStore.user
    if (!user) return

    // Set event bus context
    setContext(config.role, user.id)

    // Subscribe to database changes based on role
    await subscribeToChanges()

    // Subscribe to cross-role events
    subscribeToEvents()

    // Start location sync if provider
    if (config.role === 'provider' && config.enableLocationSync) {
      startLocationSync()
    }

    syncStats.value.connectionStatus = 'connected'
    isConnected.value = true
    eventBus.setConnected(true)
  }

  // Subscribe to database changes
  async function subscribeToChanges(): Promise<void> {
    for (const serviceType of serviceTypes.value) {
      const tableName = getTableName(serviceType)
      const channelName = `${config.role}_${serviceType}_sync`

      let channel: RealtimeChannel

      switch (config.role) {
        case 'customer':
          channel = createCustomerChannel(tableName, channelName, serviceType)
          break
        case 'provider':
          channel = createProviderChannel(tableName, channelName, serviceType)
          break
        case 'admin':
          channel = createAdminChannel(tableName, channelName, serviceType)
          break
        default:
          continue
      }

      channels.value.push(channel)
    }

    // Subscribe to provider location updates (for customers tracking their ride)
    if (config.role === 'customer' && config.providerId) {
      const locationChannel = supabase
        .channel(`provider_location_${config.providerId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'service_providers',
            filter: `id=eq.${config.providerId}`
          },
          (payload) => {
            handleProviderLocationUpdate(payload.new as any)
          }
        )
        .subscribe()

      channels.value.push(locationChannel)
    }
  }

  // Create customer-specific channel
  function createCustomerChannel(
    tableName: string, 
    channelName: string,
    serviceType: ServiceType
  ): RealtimeChannel {
    const userId = authStore.user?.id

    return supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: tableName,
          filter: `user_id=eq.${userId}`
        },
        (payload) => handleRequestUpdate(payload, serviceType)
      )
      .subscribe((status) => {
        handleSubscriptionStatus(status, channelName)
      })
  }

  // Create provider-specific channel
  function createProviderChannel(
    tableName: string,
    channelName: string,
    serviceType: ServiceType
  ): RealtimeChannel {
    const providerId = authStore.user?.id

    return supabase
      .channel(channelName)
      // New pending jobs
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: tableName,
          filter: 'status=eq.pending'
        },
        (payload) => handleNewJob(payload, serviceType)
      )
      // Updates to assigned jobs
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: tableName,
          filter: `provider_id=eq.${providerId}`
        },
        (payload) => handleRequestUpdate(payload, serviceType)
      )
      // Jobs no longer available (accepted by others)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: tableName
        },
        (payload) => {
          const data = payload.new as any
          if (data.status !== 'pending' && data.provider_id !== providerId) {
            handleJobTaken(data.id, serviceType)
          }
        }
      )
      .subscribe((status) => {
        handleSubscriptionStatus(status, channelName)
      })
  }

  // Create admin-specific channel (monitors everything)
  function createAdminChannel(
    tableName: string,
    channelName: string,
    serviceType: ServiceType
  ): RealtimeChannel {
    return supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: tableName
        },
        (payload) => handleAdminUpdate(payload, serviceType)
      )
      .subscribe((status) => {
        handleSubscriptionStatus(status, channelName)
      })
  }

  // Handle request update
  function handleRequestUpdate(
    payload: RealtimePostgresChangesPayload<any>,
    serviceType: ServiceType
  ): void {
    const newData = payload.new as any
    const oldData = payload.old as any

    syncStats.value.eventsReceived++
    syncStats.value.lastEventTime = new Date().toISOString()

    // Emit status change event if status changed
    if (oldData?.status && newData.status !== oldData.status) {
      CrossRoleEvents.statusChanged(
        {
          requestId: newData.id,
          serviceType,
          oldStatus: oldData.status,
          newStatus: newData.status,
          changedBy: config.role,
          changedById: authStore.user?.id || ''
        },
        newData.user_id,
        newData.provider_id
      )
    }

    // Emit matched event
    if (newData.status === 'matched' && oldData?.status === 'pending') {
      CrossRoleEvents.requestMatched({
        requestId: newData.id,
        serviceType,
        customerId: newData.user_id,
        providerId: newData.provider_id,
        providerName: '', // Will be fetched
        providerPhone: ''
      })
    }

    // Emit completed event
    if (newData.status === 'completed' && oldData?.status !== 'completed') {
      CrossRoleEvents.requestCompleted({
        requestId: newData.id,
        serviceType,
        customerId: newData.user_id,
        providerId: newData.provider_id,
        finalFare: newData.actual_fare || newData.estimated_fare,
        providerEarnings: 0, // Calculated server-side
        platformFee: 0,
        duration: 0
      })
    }
  }

  // Handle new job (for providers)
  function handleNewJob(
    payload: RealtimePostgresChangesPayload<any>,
    serviceType: ServiceType
  ): void {
    const newJob = payload.new as any

    syncStats.value.eventsReceived++
    syncStats.value.lastEventTime = new Date().toISOString()

    CrossRoleEvents.requestCreated({
      requestId: newJob.id,
      trackingId: newJob.tracking_id,
      serviceType,
      customerId: newJob.user_id,
      pickupLat: newJob.pickup_lat,
      pickupLng: newJob.pickup_lng,
      estimatedFare: newJob.estimated_fare
    })

    // Play notification sound
    if (config.enableNotifications) {
      playNotificationSound()
    }
  }

  // Handle job taken by another provider
  function handleJobTaken(requestId: string, serviceType: ServiceType): void {
    emit('provider:job_accepted', {
      requestId,
      serviceType,
      takenByOther: true
    })
  }

  // Handle admin update (all events)
  function handleAdminUpdate(
    payload: RealtimePostgresChangesPayload<any>,
    serviceType: ServiceType
  ): void {
    syncStats.value.eventsReceived++
    syncStats.value.lastEventTime = new Date().toISOString()

    const eventType = payload.eventType
    const data = payload.new as any

    emit(`admin:${eventType}` as any, {
      serviceType,
      data,
      eventType
    })
  }

  // Handle provider location update
  function handleProviderLocationUpdate(provider: any): void {
    if (!provider.current_lat || !provider.current_lng) return

    CrossRoleEvents.providerLocationUpdated(
      {
        providerId: provider.id,
        lat: provider.current_lat,
        lng: provider.current_lng,
        heading: provider.heading,
        speed: provider.speed
      },
      authStore.user?.id || '',
      config.requestIds?.[0] || ''
    )
  }

  // Subscribe to cross-role events
  function subscribeToEvents(): void {
    // Listen for events relevant to this role
    subscribe('*', (event: CrossRoleEvent) => {
      // Handle based on role
      switch (config.role) {
        case 'customer':
          handleCustomerEvent(event)
          break
        case 'provider':
          handleProviderEvent(event)
          break
        case 'admin':
          handleAdminEvent(event)
          break
      }
    })
  }

  // Handle customer-specific events
  function handleCustomerEvent(event: CrossRoleEvent): void {
    switch (event.type) {
      case 'request:matched':
        // Show provider info
        break
      case 'provider:location_updated':
        // Update map marker
        break
      case 'request:completed':
        // Show rating modal
        break
    }
  }

  // Handle provider-specific events
  function handleProviderEvent(event: CrossRoleEvent): void {
    switch (event.type) {
      case 'request:created':
        // Add to available jobs
        break
      case 'request:cancelled':
        // Remove from current job if applicable
        break
    }
  }

  // Handle admin-specific events
  function handleAdminEvent(event: CrossRoleEvent): void {
    // Admin sees all events for monitoring
    console.log('[Admin Monitor]', event.type, event.payload)
  }

  // Start location sync for providers
  function startLocationSync(): void {
    if (locationUpdateInterval.value) return

    const updateLocation = async () => {
      if (!navigator.geolocation) return

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude, heading, speed, accuracy } = position.coords
          
          await supabase
            .from('service_providers')
            .update({
              current_lat: latitude,
              current_lng: longitude,
              heading: heading || null,
              speed: speed || null,
              location_accuracy: accuracy,
              location_updated_at: new Date().toISOString()
            })
            .eq('id', authStore.user?.id)
        },
        (error) => {
          console.error('Location error:', error)
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 5000
        }
      )
    }

    // Update immediately
    updateLocation()

    // Then every 10 seconds
    locationUpdateInterval.value = window.setInterval(updateLocation, 10000)
  }

  // Stop location sync
  function stopLocationSync(): void {
    if (locationUpdateInterval.value) {
      clearInterval(locationUpdateInterval.value)
      locationUpdateInterval.value = null
    }
  }

  // Handle subscription status
  function handleSubscriptionStatus(status: string, channelName: string): void {
    if (status === 'SUBSCRIBED') {
      console.log(`[Sync] Connected to ${channelName}`)
    } else if (status === 'CHANNEL_ERROR') {
      console.error(`[Sync] Error on ${channelName}`)
      syncStats.value.connectionStatus = 'reconnecting'
    } else if (status === 'CLOSED') {
      console.log(`[Sync] Closed ${channelName}`)
    }
  }

  // Play notification sound
  function playNotificationSound(): void {
    try {
      const audio = new Audio('/sounds/notification.mp3')
      audio.volume = 0.5
      audio.play().catch(() => {})
    } catch {}
  }

  // Cleanup
  async function cleanup(): Promise<void> {
    stopLocationSync()
    
    for (const channel of channels.value) {
      await supabase.removeChannel(channel)
    }
    channels.value = []
    
    isConnected.value = false
    syncStats.value.connectionStatus = 'disconnected'
    eventBus.setConnected(false)
  }

  // Lifecycle
  onMounted(() => {
    initialize()
  })

  onUnmounted(() => {
    cleanup()
  })

  // Watch for auth changes
  watch(() => authStore.user, (newUser) => {
    if (newUser) {
      cleanup().then(() => initialize())
    } else {
      cleanup()
    }
  })

  return {
    isConnected,
    syncStats,
    initialize,
    cleanup,
    startLocationSync,
    stopLocationSync
  }
}
