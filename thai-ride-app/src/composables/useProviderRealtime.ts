/**
 * useProviderRealtime - Enhanced Realtime System for Provider Dashboard
 * Feature: F14 - Provider Dashboard (Realtime Priority)
 * 
 * CRITICAL REQUIREMENTS:
 * 1. Sub-second latency for new job notifications
 * 2. Automatic reconnection with exponential backoff
 * 3. Connection health monitoring (heartbeat)
 * 4. Optimistic updates with rollback
 * 5. Offline queue for actions during disconnection
 * 6. Sound/vibration alerts for new jobs
 */

import { ref, computed, onUnmounted, watch } from 'vue'
import { supabase } from '../lib/supabase'

// =====================================================
// TYPES
// =====================================================
export interface RealtimeJob {
  id: string
  tracking_id: string
  type: 'ride' | 'delivery' | 'shopping' | 'queue' | 'moving' | 'laundry'
  status: string
  pickup: {
    lat: number
    lng: number
    address: string
  }
  destination: {
    lat: number
    lng: number
    address: string
  }
  customer: {
    id: string
    name: string
    phone: string
    rating?: number
  }
  fare: number
  distance?: number
  eta?: number // minutes
  created_at: string
  expires_at?: string // job expiration time
}

export interface ConnectionStatus {
  state: 'connected' | 'connecting' | 'disconnected' | 'error'
  lastPing: Date | null
  latency: number // ms
  reconnectAttempts: number
}

export interface RealtimeConfig {
  pollingInterval: number // ms - fallback polling
  heartbeatInterval: number // ms - connection check
  reconnectBaseDelay: number // ms
  maxReconnectAttempts: number
  jobExpirationSeconds: number // auto-remove stale jobs
}

const DEFAULT_CONFIG: RealtimeConfig = {
  pollingInterval: 10000, // 10 seconds (reduced from 30s)
  heartbeatInterval: 5000, // 5 seconds
  reconnectBaseDelay: 1000, // 1 second
  maxReconnectAttempts: 10,
  jobExpirationSeconds: 300 // 5 minutes
}

// =====================================================
// MAIN COMPOSABLE
// =====================================================
export function useProviderRealtime(providerId: () => string | null, config: Partial<RealtimeConfig> = {}) {
  const cfg = { ...DEFAULT_CONFIG, ...config }
  
  // =====================================================
  // STATE
  // =====================================================
  const connectionStatus = ref<ConnectionStatus>({
    state: 'disconnected',
    lastPing: null,
    latency: 0,
    reconnectAttempts: 0
  })
  
  const pendingJobs = ref<RealtimeJob[]>([])
  const activeJob = ref<RealtimeJob | null>(null)
  const isSubscribed = ref(false)
  
  // Offline action queue
  const offlineQueue = ref<Array<{ action: string; payload: any; timestamp: Date }>>([])
  
  // Channels
  let mainChannel: any = null
  let heartbeatInterval: number | null = null
  let pollingInterval: number | null = null
  let reconnectTimeout: number | null = null

  // =====================================================
  // COMPUTED
  // =====================================================
  const isConnected = computed(() => connectionStatus.value.state === 'connected')
  const isReconnecting = computed(() => connectionStatus.value.state === 'connecting')
  const hasOfflineActions = computed(() => offlineQueue.value.length > 0)
  
  const jobsByType = computed(() => ({
    ride: pendingJobs.value.filter(j => j.type === 'ride'),
    delivery: pendingJobs.value.filter(j => j.type === 'delivery'),
    shopping: pendingJobs.value.filter(j => j.type === 'shopping'),
    queue: pendingJobs.value.filter(j => j.type === 'queue'),
    moving: pendingJobs.value.filter(j => j.type === 'moving'),
    laundry: pendingJobs.value.filter(j => j.type === 'laundry')
  }))

  // =====================================================
  // SUBSCRIBE TO ALL TABLES
  // =====================================================
  async function subscribe() {
    const pid = providerId()
    if (!pid || isSubscribed.value) return
    
    connectionStatus.value.state = 'connecting'
    
    try {
      // Create unified channel for all service types
      mainChannel = supabase.channel(`provider_realtime_${pid}`, {
        config: {
          broadcast: { self: true },
          presence: { key: pid }
        }
      })
      
      // Subscribe to ride_requests
      mainChannel.on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'ride_requests'
      }, (payload: any) => handleTableChange('ride', payload))
      
      // Subscribe to delivery_requests
      mainChannel.on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'delivery_requests'
      }, (payload: any) => handleTableChange('delivery', payload))
      
      // Subscribe to shopping_requests
      mainChannel.on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'shopping_requests'
      }, (payload: any) => handleTableChange('shopping', payload))
      
      // Subscribe to queue_bookings
      mainChannel.on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'queue_bookings'
      }, (payload: any) => handleTableChange('queue', payload))
      
      // Subscribe to moving_requests
      mainChannel.on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'moving_requests'
      }, (payload: any) => handleTableChange('moving', payload))
      
      // Subscribe to laundry_requests
      mainChannel.on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'laundry_requests'
      }, (payload: any) => handleTableChange('laundry', payload))
      
      // Subscribe with status callback
      await mainChannel.subscribe((status: string) => {
        console.log('[Realtime] Channel status:', status)
        
        if (status === 'SUBSCRIBED') {
          connectionStatus.value.state = 'connected'
          connectionStatus.value.reconnectAttempts = 0
          isSubscribed.value = true
          
          // Start heartbeat
          startHeartbeat()
          
          // Process offline queue
          processOfflineQueue()
          
          // Initial fetch
          fetchAllPendingJobs()
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          connectionStatus.value.state = 'error'
          scheduleReconnect()
        } else if (status === 'CLOSED') {
          connectionStatus.value.state = 'disconnected'
          isSubscribed.value = false
        }
      })
      
      // Start polling as fallback
      startPolling()
      
    } catch (error) {
      console.error('[Realtime] Subscribe error:', error)
      connectionStatus.value.state = 'error'
      scheduleReconnect()
    }
  }

  // =====================================================
  // HANDLE TABLE CHANGES
  // =====================================================
  function handleTableChange(type: RealtimeJob['type'], payload: any) {
    const { eventType, new: newRecord, old: oldRecord } = payload
    const pid = providerId()
    
    console.log(`[Realtime] ${type} ${eventType}:`, newRecord?.id || oldRecord?.id)
    
    switch (eventType) {
      case 'INSERT':
        handleNewJob(type, newRecord)
        break
      case 'UPDATE':
        handleJobUpdate(type, newRecord, oldRecord, pid)
        break
      case 'DELETE':
        handleJobDelete(newRecord?.id || oldRecord?.id)
        break
    }
  }

  async function handleNewJob(type: RealtimeJob['type'], record: any) {
    // Only show pending jobs without provider
    if (record.status !== 'pending' || record.provider_id) return
    
    // Check if already exists
    if (pendingJobs.value.some(j => j.id === record.id)) return
    
    // Fetch customer info for complete data
    const job = await enrichJobData(type, record)
    if (!job) return
    
    // Add to list (newest first)
    pendingJobs.value = [job, ...pendingJobs.value]
    
    // Emit event for sound/vibration
    emitNewJobEvent(job)
  }

  function handleJobUpdate(type: RealtimeJob['type'], newRecord: any, oldRecord: any, pid: string | null) {
    const jobId = newRecord.id
    
    // Check if this job was accepted by current provider
    if (newRecord.provider_id === pid && oldRecord?.provider_id !== pid) {
      // Job was accepted by us - move to active
      const job = pendingJobs.value.find(j => j.id === jobId)
      if (job) {
        activeJob.value = { ...job, status: newRecord.status }
        pendingJobs.value = pendingJobs.value.filter(j => j.id !== jobId)
      }
      return
    }
    
    // Check if job is no longer available
    if (newRecord.status !== 'pending' || newRecord.provider_id) {
      pendingJobs.value = pendingJobs.value.filter(j => j.id !== jobId)
      return
    }
    
    // Update active job status
    if (activeJob.value?.id === jobId) {
      if (newRecord.status === 'cancelled') {
        activeJob.value = null
        emitJobCancelledEvent(jobId)
      } else {
        activeJob.value = { ...activeJob.value, status: newRecord.status }
      }
    }
  }

  function handleJobDelete(jobId: string) {
    pendingJobs.value = pendingJobs.value.filter(j => j.id !== jobId)
    if (activeJob.value?.id === jobId) {
      activeJob.value = null
    }
  }

  // =====================================================
  // ENRICH JOB DATA (Fetch customer info)
  // =====================================================
  async function enrichJobData(type: RealtimeJob['type'], record: any): Promise<RealtimeJob | null> {
    try {
      // Fetch customer info
      let customerName = 'ลูกค้า'
      let customerPhone = ''
      let customerRating: number | undefined
      
      if (record.user_id) {
        const { data: user } = await supabase
          .from('users')
          .select('first_name, last_name, phone_number')
          .eq('id', record.user_id)
          .single()
        
        if (user) {
          const userData = user as { first_name?: string; last_name?: string; phone_number?: string }
          customerName = `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || 'ลูกค้า'
          customerPhone = userData.phone_number || ''
        }
      }
      
      // Calculate distance if coordinates available
      let distance: number | undefined
      let eta: number | undefined
      
      const pickupLat = record.pickup_lat || record.sender_lat || record.store_lat
      const pickupLng = record.pickup_lng || record.sender_lng || record.store_lng
      const destLat = record.destination_lat || record.recipient_lat || record.delivery_lat
      const destLng = record.destination_lng || record.recipient_lng || record.delivery_lng
      
      if (pickupLat && pickupLng && destLat && destLng) {
        distance = calculateDistance(pickupLat, pickupLng, destLat, destLng)
        eta = Math.round(distance * 2) // ~2 min per km estimate
      }
      
      return {
        id: record.id,
        tracking_id: record.tracking_id || '',
        type,
        status: record.status,
        pickup: {
          lat: pickupLat || 0,
          lng: pickupLng || 0,
          address: record.pickup_address || record.sender_address || record.store_address || ''
        },
        destination: {
          lat: destLat || 0,
          lng: destLng || 0,
          address: record.destination_address || record.recipient_address || record.delivery_address || ''
        },
        customer: {
          id: record.user_id || '',
          name: customerName,
          phone: customerPhone,
          rating: customerRating
        },
        fare: record.estimated_fare || record.estimated_fee || record.service_fee || 0,
        distance,
        eta,
        created_at: record.created_at,
        expires_at: new Date(Date.now() + cfg.jobExpirationSeconds * 1000).toISOString()
      }
    } catch (error) {
      console.error('[Realtime] Error enriching job data:', error)
      return null
    }
  }

  // =====================================================
  // FETCH ALL PENDING JOBS (Initial load + Polling)
  // =====================================================
  async function fetchAllPendingJobs() {
    const pid = providerId()
    if (!pid) return
    
    try {
      const jobs: RealtimeJob[] = []
      
      // Fetch rides
      const { data: rides } = await supabase
        .from('ride_requests')
        .select(`
          id, tracking_id, status, pickup_lat, pickup_lng, pickup_address,
          destination_lat, destination_lng, destination_address,
          estimated_fare, created_at, user_id,
          users:user_id (first_name, last_name, phone_number)
        `)
        .eq('status', 'pending')
        .is('provider_id', null)
        .order('created_at', { ascending: false })
        .limit(20)
      
      if (rides) {
        jobs.push(...rides.map((r: any) => mapToRealtimeJob('ride', r)))
      }
      
      // Fetch deliveries
      const { data: deliveries } = await supabase
        .from('delivery_requests')
        .select(`
          id, tracking_id, status, sender_lat, sender_lng, sender_address,
          recipient_lat, recipient_lng, recipient_address,
          estimated_fee, created_at, user_id,
          users:user_id (first_name, last_name, phone_number)
        `)
        .eq('status', 'pending')
        .is('provider_id', null)
        .order('created_at', { ascending: false })
        .limit(20)
      
      if (deliveries) {
        jobs.push(...deliveries.map((d: any) => mapToRealtimeJob('delivery', d)))
      }
      
      // Fetch shopping
      const { data: shopping } = await supabase
        .from('shopping_requests')
        .select(`
          id, tracking_id, status, store_lat, store_lng, store_address, store_name,
          delivery_lat, delivery_lng, delivery_address,
          service_fee, created_at, user_id,
          users:user_id (first_name, last_name, phone_number)
        `)
        .eq('status', 'pending')
        .is('provider_id', null)
        .order('created_at', { ascending: false })
        .limit(20)
      
      if (shopping) {
        jobs.push(...shopping.map((s: any) => mapToRealtimeJob('shopping', s)))
      }
      
      // Sort by created_at descending
      jobs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      
      // Update state (merge with existing to preserve optimistic updates)
      const existingIds = new Set(pendingJobs.value.filter(j => (j as any)._accepting).map(j => j.id))
      pendingJobs.value = jobs.filter(j => !existingIds.has(j.id))
      
      console.log(`[Realtime] Fetched ${jobs.length} pending jobs`)
    } catch (error) {
      console.error('[Realtime] Error fetching jobs:', error)
    }
  }

  function mapToRealtimeJob(type: RealtimeJob['type'], record: any): RealtimeJob {
    const user = record.users as { first_name?: string; last_name?: string; phone_number?: string } | null
    const customerName = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'ลูกค้า' : 'ลูกค้า'
    
    const pickupLat = record.pickup_lat || record.sender_lat || record.store_lat || 0
    const pickupLng = record.pickup_lng || record.sender_lng || record.store_lng || 0
    const destLat = record.destination_lat || record.recipient_lat || record.delivery_lat || 0
    const destLng = record.destination_lng || record.recipient_lng || record.delivery_lng || 0
    
    const distance = pickupLat && destLat ? calculateDistance(pickupLat, pickupLng, destLat, destLng) : undefined
    
    return {
      id: record.id,
      tracking_id: record.tracking_id || '',
      type,
      status: record.status,
      pickup: {
        lat: pickupLat,
        lng: pickupLng,
        address: record.pickup_address || record.sender_address || record.store_address || record.store_name || ''
      },
      destination: {
        lat: destLat,
        lng: destLng,
        address: record.destination_address || record.recipient_address || record.delivery_address || ''
      },
      customer: {
        id: record.user_id || '',
        name: customerName,
        phone: user?.phone_number || '',
        rating: undefined
      },
      fare: record.estimated_fare || record.estimated_fee || record.service_fee || 0,
      distance,
      eta: distance ? Math.round(distance * 2) : undefined,
      created_at: record.created_at
    }
  }

  // =====================================================
  // HEARTBEAT - Connection Health Check
  // =====================================================
  function startHeartbeat() {
    stopHeartbeat()
    
    heartbeatInterval = window.setInterval(async () => {
      const start = Date.now()
      
      try {
        // Simple ping to check connection
        const { error } = await supabase.from('users').select('id').limit(1).single()
        
        if (!error || error.code === 'PGRST116') { // PGRST116 = no rows returned (OK)
          connectionStatus.value.latency = Date.now() - start
          connectionStatus.value.lastPing = new Date()
          
          if (connectionStatus.value.state !== 'connected') {
            connectionStatus.value.state = 'connected'
          }
        } else {
          throw error
        }
      } catch (error) {
        console.warn('[Realtime] Heartbeat failed:', error)
        connectionStatus.value.state = 'error'
        scheduleReconnect()
      }
    }, cfg.heartbeatInterval)
  }

  function stopHeartbeat() {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval)
      heartbeatInterval = null
    }
  }

  // =====================================================
  // POLLING - Fallback for missed events
  // =====================================================
  function startPolling() {
    stopPolling()
    
    pollingInterval = window.setInterval(() => {
      if (isConnected.value && !activeJob.value) {
        fetchAllPendingJobs()
      }
    }, cfg.pollingInterval)
  }

  function stopPolling() {
    if (pollingInterval) {
      clearInterval(pollingInterval)
      pollingInterval = null
    }
  }

  // =====================================================
  // RECONNECTION - Exponential Backoff
  // =====================================================
  function scheduleReconnect() {
    if (reconnectTimeout) clearTimeout(reconnectTimeout)
    
    const attempts = connectionStatus.value.reconnectAttempts
    if (attempts >= cfg.maxReconnectAttempts) {
      console.error('[Realtime] Max reconnect attempts reached')
      connectionStatus.value.state = 'error'
      return
    }
    
    const delay = cfg.reconnectBaseDelay * Math.pow(2, attempts)
    console.log(`[Realtime] Reconnecting in ${delay}ms (attempt ${attempts + 1})`)
    
    connectionStatus.value.state = 'connecting'
    connectionStatus.value.reconnectAttempts++
    
    reconnectTimeout = window.setTimeout(() => {
      unsubscribe()
      subscribe()
    }, delay)
  }

  // =====================================================
  // OFFLINE QUEUE
  // =====================================================
  function queueOfflineAction(action: string, payload: any) {
    offlineQueue.value.push({
      action,
      payload,
      timestamp: new Date()
    })
  }

  async function processOfflineQueue() {
    if (offlineQueue.value.length === 0) return
    
    console.log(`[Realtime] Processing ${offlineQueue.value.length} offline actions`)
    
    const queue = [...offlineQueue.value]
    offlineQueue.value = []
    
    for (const item of queue) {
      try {
        // Process based on action type
        // This would be implemented based on specific actions
        console.log('[Realtime] Processing offline action:', item.action)
      } catch (error) {
        console.error('[Realtime] Error processing offline action:', error)
      }
    }
  }

  // =====================================================
  // EVENTS
  // =====================================================
  const eventListeners = new Map<string, Set<Function>>()
  
  function on(event: string, callback: Function) {
    if (!eventListeners.has(event)) {
      eventListeners.set(event, new Set())
    }
    eventListeners.get(event)!.add(callback)
    
    return () => eventListeners.get(event)?.delete(callback)
  }

  function emit(event: string, data: any) {
    eventListeners.get(event)?.forEach(cb => cb(data))
  }

  function emitNewJobEvent(job: RealtimeJob) {
    emit('newJob', job)
  }

  function emitJobCancelledEvent(jobId: string) {
    emit('jobCancelled', { jobId })
  }

  // =====================================================
  // UNSUBSCRIBE
  // =====================================================
  function unsubscribe() {
    stopHeartbeat()
    stopPolling()
    
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout)
      reconnectTimeout = null
    }
    
    if (mainChannel) {
      mainChannel.unsubscribe()
      mainChannel = null
    }
    
    isSubscribed.value = false
    connectionStatus.value.state = 'disconnected'
  }

  // =====================================================
  // UTILITIES
  // =====================================================
  function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371 // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng/2)**2
    return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)) * 10) / 10
  }

  function removeExpiredJobs() {
    const now = Date.now()
    pendingJobs.value = pendingJobs.value.filter(job => {
      if (!job.expires_at) return true
      return new Date(job.expires_at).getTime() > now
    })
  }

  // Auto-remove expired jobs every minute
  const expirationInterval = setInterval(removeExpiredJobs, 60000)

  // =====================================================
  // CLEANUP
  // =====================================================
  onUnmounted(() => {
    unsubscribe()
    clearInterval(expirationInterval)
    eventListeners.clear()
  })

  // =====================================================
  // RETURN
  // =====================================================
  return {
    // State
    connectionStatus,
    pendingJobs,
    activeJob,
    isSubscribed,
    offlineQueue,
    
    // Computed
    isConnected,
    isReconnecting,
    hasOfflineActions,
    jobsByType,
    
    // Methods
    subscribe,
    unsubscribe,
    fetchAllPendingJobs,
    queueOfflineAction,
    
    // Events
    on,
    
    // Utils
    calculateDistance
  }
}
