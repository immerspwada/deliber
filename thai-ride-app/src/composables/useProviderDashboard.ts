/**
 * useProviderDashboard - Enhanced Provider Dashboard Logic
 * Feature: F14 - Provider Dashboard (50-Session Stability)
 * 
 * Design Principles:
 * 1. Memory-safe: Auto-cleanup all subscriptions/timers
 * 2. URL Sync: State reflected in URL params
 * 3. Optimistic UI: Instant feedback, rollback on error
 * 4. Retry Logic: Exponential backoff for network failures
 * 5. Clean State: Reset forms after submission
 */

import { ref, computed, watch, onUnmounted, shallowRef, triggerRef } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'

// =====================================================
// TYPES
// =====================================================
export interface ProviderProfile {
  id: string
  user_id: string
  provider_type: 'driver' | 'delivery' | 'both'
  license_number: string | null
  vehicle_type: string | null
  vehicle_plate: string | null
  is_verified: boolean
  is_available: boolean
  rating: number
  total_trips: number
  current_lat: number | null
  current_lng: number | null
  status?: string
}

export interface PendingRequest {
  id: string
  tracking_id?: string
  type: 'ride' | 'delivery' | 'shopping' | 'queue' | 'moving' | 'laundry'
  pickup_address: string
  destination_address: string
  estimated_fare: number
  distance?: number
  customer_name?: string
  customer_rating?: number
  created_at: string
  // For optimistic updates
  _accepting?: boolean
  _declining?: boolean
}

export interface ActiveJob {
  id: string
  tracking_id: string
  type: 'ride' | 'delivery' | 'shopping' | 'queue' | 'moving' | 'laundry'
  status: string
  customer: { id: string; name: string; phone: string; rating?: number }
  pickup: { lat: number; lng: number; address: string }
  destination: { lat: number; lng: number; address: string }
  fare: number
  created_at: string
}


export interface EarningsSummary {
  today: number
  thisWeek: number
  thisMonth: number
  todayTrips: number
  weekTrips: number
  monthTrips: number
}

export type TabType = 'all' | 'ride' | 'delivery' | 'shopping' | 'queue' | 'moving' | 'laundry'
export type SortType = 'newest' | 'fare_high' | 'fare_low' | 'distance'

// =====================================================
// CLEANUP REGISTRY - Memory Management
// =====================================================
class CleanupRegistry {
  private cleanups: Set<() => void> = new Set()
  private intervals: Set<number> = new Set()
  private timeouts: Set<number> = new Set()
  private subscriptions: Set<{ unsubscribe: () => void }> = new Set()

  addCleanup(fn: () => void) {
    this.cleanups.add(fn)
    return () => this.cleanups.delete(fn)
  }

  addInterval(id: number) {
    this.intervals.add(id)
    return () => {
      clearInterval(id)
      this.intervals.delete(id)
    }
  }

  addTimeout(id: number) {
    this.timeouts.add(id)
    return () => {
      clearTimeout(id)
      this.timeouts.delete(id)
    }
  }

  addSubscription(sub: { unsubscribe: () => void }) {
    this.subscriptions.add(sub)
    return () => {
      sub.unsubscribe()
      this.subscriptions.delete(sub)
    }
  }

  cleanupAll() {
    this.cleanups.forEach(fn => fn())
    this.cleanups.clear()
    
    this.intervals.forEach(id => clearInterval(id))
    this.intervals.clear()
    
    this.timeouts.forEach(id => clearTimeout(id))
    this.timeouts.clear()
    
    this.subscriptions.forEach(sub => sub.unsubscribe())
    this.subscriptions.clear()
  }
}

// =====================================================
// RETRY LOGIC - Exponential Backoff
// =====================================================
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: Error | null = null
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error
      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }
  
  throw lastError
}


// =====================================================
// MAIN COMPOSABLE
// =====================================================
export function useProviderDashboard() {
  const router = useRouter()
  const route = useRoute()
  const authStore = useAuthStore()
  const cleanup = new CleanupRegistry()

  // =====================================================
  // STATE - Using shallowRef for large arrays (performance)
  // =====================================================
  const loading = ref(false)
  const error = ref<string | null>(null)
  const isInitialized = ref(false)
  const networkStatus = ref<'online' | 'offline' | 'reconnecting'>('online')
  
  // Profile
  const profile = ref<ProviderProfile | null>(null)
  const isOnline = ref(false)
  
  // Requests - shallowRef for performance with large lists
  const pendingRequests = shallowRef<PendingRequest[]>([])
  const activeJob = ref<ActiveJob | null>(null)
  
  // Earnings
  const earnings = ref<EarningsSummary>({
    today: 0, thisWeek: 0, thisMonth: 0,
    todayTrips: 0, weekTrips: 0, monthTrips: 0
  })

  // =====================================================
  // URL STATE SYNC
  // =====================================================
  const currentTab = computed({
    get: () => (route.query.tab as TabType) || 'all',
    set: (val) => updateUrlParams({ tab: val === 'all' ? undefined : val })
  })

  const currentSort = computed({
    get: () => (route.query.sort as SortType) || 'newest',
    set: (val) => updateUrlParams({ sort: val === 'newest' ? undefined : val })
  })

  const searchQuery = computed({
    get: () => (route.query.search as string) || '',
    set: (val) => updateUrlParams({ search: val || undefined })
  })

  function updateUrlParams(params: Record<string, string | undefined>) {
    const newQuery = { ...route.query }
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined) delete newQuery[key]
      else newQuery[key] = value
    })
    router.replace({ query: newQuery })
  }

  // =====================================================
  // COMPUTED - Filtered & Sorted Requests
  // =====================================================
  const filteredRequests = computed(() => {
    let result = [...pendingRequests.value]
    
    // Filter by tab
    if (currentTab.value !== 'all') {
      result = result.filter(r => r.type === currentTab.value)
    }
    
    // Filter by search
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase()
      result = result.filter(r => 
        r.pickup_address.toLowerCase().includes(query) ||
        r.destination_address.toLowerCase().includes(query) ||
        r.customer_name?.toLowerCase().includes(query)
      )
    }
    
    // Sort
    switch (currentSort.value) {
      case 'fare_high':
        result.sort((a, b) => b.estimated_fare - a.estimated_fare)
        break
      case 'fare_low':
        result.sort((a, b) => a.estimated_fare - b.estimated_fare)
        break
      case 'distance':
        result.sort((a, b) => (a.distance || 999) - (b.distance || 999))
        break
      default: // newest
        result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    }
    
    return result
  })

  const requestCounts = computed(() => ({
    all: pendingRequests.value.length,
    ride: pendingRequests.value.filter(r => r.type === 'ride').length,
    delivery: pendingRequests.value.filter(r => r.type === 'delivery').length,
    shopping: pendingRequests.value.filter(r => r.type === 'shopping').length,
    queue: pendingRequests.value.filter(r => r.type === 'queue').length,
    moving: pendingRequests.value.filter(r => r.type === 'moving').length,
    laundry: pendingRequests.value.filter(r => r.type === 'laundry').length
  }))

  const hasActiveJob = computed(() => activeJob.value !== null)
  const isDemoMode = computed(() => localStorage.getItem('demo_mode') === 'true')


  // =====================================================
  // FETCH PROFILE - With Retry
  // =====================================================
  async function fetchProfile(): Promise<ProviderProfile | null> {
    loading.value = true
    error.value = null
    
    try {
      if (isDemoMode.value) {
        const demoUser = JSON.parse(localStorage.getItem('demo_user') || '{}')
        profile.value = {
          id: 'demo-provider-' + (demoUser.role || 'driver'),
          user_id: demoUser.id || 'demo-user',
          provider_type: demoUser.role === 'driver' ? 'driver' : 'delivery',
          license_number: 'กข 1234',
          vehicle_type: demoUser.role === 'driver' ? 'รถยนต์' : 'มอเตอร์ไซค์',
          vehicle_plate: 'กข 1234 กรุงเทพ',
          is_verified: true,
          is_available: false,
          rating: 4.8,
          total_trips: 156,
          current_lat: 13.7563,
          current_lng: 100.5018,
          status: 'approved'
        }
        return profile.value
      }

      if (!authStore.user?.id) {
        profile.value = null
        return null
      }

      const data = await retryWithBackoff(async () => {
        const { data, error: fetchError } = await (supabase
          .from('service_providers') as any)
          .select('*')
          .eq('user_id', authStore.user!.id)
          .single()
        
        if (fetchError) throw fetchError
        return data
      })

      profile.value = data as ProviderProfile
      isOnline.value = data?.is_available || false
      return data
    } catch (e: any) {
      error.value = e.message
      return null
    } finally {
      loading.value = false
    }
  }

  // =====================================================
  // FETCH EARNINGS
  // =====================================================
  async function fetchEarnings() {
    if (!profile.value?.id) return

    if (isDemoMode.value) {
      earnings.value = {
        today: 1250, thisWeek: 8500, thisMonth: 32000,
        todayTrips: 8, weekTrips: 45, monthTrips: 180
      }
      return
    }

    try {
      const { data } = await (supabase.rpc as any)('get_provider_earnings_summary', {
        p_provider_id: profile.value.id
      })
      
      if (data?.[0]) {
        earnings.value = {
          today: data[0].today_earnings || 0,
          thisWeek: data[0].week_earnings || 0,
          thisMonth: data[0].month_earnings || 0,
          todayTrips: data[0].today_trips || 0,
          weekTrips: data[0].week_trips || 0,
          monthTrips: data[0].month_trips || 0
        }
      }
    } catch (e) {
      console.warn('Error fetching earnings:', e)
    }
  }


  // =====================================================
  // TOGGLE ONLINE STATUS
  // =====================================================
  async function toggleOnline(online: boolean, location?: { lat: number; lng: number }) {
    loading.value = true
    error.value = null
    
    // Optimistic update
    const previousState = isOnline.value
    isOnline.value = online

    try {
      if (!profile.value?.id) await fetchProfile()
      if (!profile.value?.id) throw new Error('ไม่พบข้อมูลผู้ให้บริการ')

      if (isDemoMode.value) {
        if (online) {
          subscribeToAllRequests()
          startLocationUpdates()
        } else {
          unsubscribeAll()
          stopLocationUpdates()
          // Clear requests immediately
          pendingRequests.value = []
          triggerRef(pendingRequests)
        }
        return true
      }

      const { data, error: updateError } = await (supabase.rpc as any)('set_provider_availability', {
        p_provider_id: profile.value.id,
        p_is_available: online,
        p_lat: location?.lat || null,
        p_lng: location?.lng || null
      })

      if (updateError) throw updateError
      if (data?.[0] && !data[0].success) throw new Error(data[0].message)

      if (online) {
        subscribeToAllRequests()
        startLocationUpdates()
        await fetchAllPendingRequests()
      } else {
        unsubscribeAll()
        stopLocationUpdates()
        pendingRequests.value = []
        triggerRef(pendingRequests)
      }

      return true
    } catch (e: any) {
      // Rollback on error
      isOnline.value = previousState
      error.value = e.message
      return false
    } finally {
      loading.value = false
    }
  }

  // =====================================================
  // FETCH ALL PENDING REQUESTS
  // =====================================================
  async function fetchAllPendingRequests() {
    if (!profile.value?.id) return

    try {
      const results: PendingRequest[] = []

      // Fetch rides - Use direct query for V3 compatibility
      const { data: rides } = await (supabase
        .from('ride_requests') as any)
        .select(`
          id,
          tracking_id,
          pickup_address,
          destination_address,
          estimated_fare,
          pickup_lat,
          pickup_lng,
          created_at,
          users:user_id (
            first_name,
            last_name
          )
        `)
        .eq('status', 'pending')
        .is('provider_id', null)
        .order('created_at', { ascending: false })
        .limit(20)
      
      if (rides?.length) {
        results.push(...rides.map((r: any) => ({
          id: r.id,
          tracking_id: r.tracking_id,
          type: 'ride' as const,
          pickup_address: r.pickup_address,
          destination_address: r.destination_address,
          estimated_fare: r.estimated_fare || 0,
          distance: undefined, // Calculate if needed
          customer_name: r.users ? `${r.users.first_name} ${r.users.last_name}`.trim() : 'ผู้โดยสาร',
          customer_rating: undefined,
          created_at: r.created_at
        })))
      }

      // Fetch deliveries
      const { data: deliveries } = await (supabase
        .from('delivery_requests') as any)
        .select(`
          id,
          tracking_id,
          sender_address,
          recipient_address,
          estimated_fee,
          created_at,
          users:user_id (
            first_name,
            last_name
          )
        `)
        .eq('status', 'pending')
        .is('provider_id', null)
        .order('created_at', { ascending: false })
        .limit(20)
      
      if (deliveries?.length) {
        results.push(...deliveries.map((d: any) => ({
          id: d.id,
          tracking_id: d.tracking_id,
          type: 'delivery' as const,
          pickup_address: d.sender_address,
          destination_address: d.recipient_address,
          estimated_fare: d.estimated_fee || 0,
          distance: undefined,
          customer_name: d.users ? `${d.users.first_name} ${d.users.last_name}`.trim() : 'ลูกค้า',
          created_at: d.created_at
        })))
      }

      // Update with shallow ref trigger
      pendingRequests.value = results
      triggerRef(pendingRequests)
    } catch (e) {
      console.warn('Error fetching requests:', e)
    }
  }


  // =====================================================
  // ACCEPT REQUEST - Optimistic UI
  // =====================================================
  async function acceptRequest(requestId: string, type: PendingRequest['type']) {
    const request = pendingRequests.value.find(r => r.id === requestId)
    if (!request) return { success: false, error: 'ไม่พบคำขอนี้' }

    // Optimistic update - mark as accepting
    const updatedRequests = pendingRequests.value.map(r =>
      r.id === requestId ? { ...r, _accepting: true } : r
    )
    pendingRequests.value = updatedRequests
    triggerRef(pendingRequests)

    try {
      if (!profile.value?.id) throw new Error('ไม่พบข้อมูลผู้ให้บริการ')

      let rpcName = ''
      let params: Record<string, any> = {}

      switch (type) {
        case 'ride':
          // Use V3 atomic function for rides
          rpcName = 'accept_ride_atomic'
          params = { p_ride_id: requestId, p_provider_id: profile.value.id }
          break
        case 'delivery':
          rpcName = 'accept_delivery_request'
          params = { p_delivery_id: requestId, p_provider_id: profile.value.id }
          break
        case 'shopping':
          rpcName = 'accept_shopping_request'
          params = { p_shopping_id: requestId, p_provider_id: profile.value.id }
          break
        case 'queue':
          rpcName = 'accept_queue_booking'
          params = { p_booking_id: requestId, p_provider_id: profile.value.id }
          break
        case 'moving':
          rpcName = 'accept_moving_request'
          params = { p_request_id: requestId, p_provider_id: profile.value.id }
          break
        case 'laundry':
          rpcName = 'accept_laundry_request'
          params = { p_request_id: requestId, p_provider_id: profile.value.id }
          break
      }

      if (isDemoMode.value) {
        // Demo mode - simulate acceptance
        activeJob.value = {
          id: request.id,
          tracking_id: request.tracking_id || 'TR' + request.id.slice(0, 8).toUpperCase(),
          type: request.type,
          status: 'matched',
          customer: {
            id: 'demo-customer',
            name: request.customer_name || 'ลูกค้า',
            phone: '0812345678',
            rating: request.customer_rating
          },
          pickup: { lat: 13.7563, lng: 100.5018, address: request.pickup_address },
          destination: { lat: 13.7466, lng: 100.5347, address: request.destination_address },
          fare: request.estimated_fare,
          created_at: request.created_at
        }
        
        // Remove from pending
        pendingRequests.value = pendingRequests.value.filter(r => r.id !== requestId)
        triggerRef(pendingRequests)
        
        return { success: true }
      }

      const { data, error: acceptError } = await (supabase.rpc as any)(rpcName, params)
      
      if (acceptError) {
        // Handle specific error messages from atomic functions
        if (acceptError.message?.includes('RIDE_ALREADY_ACCEPTED')) {
          throw new Error('งานนี้ถูกรับไปแล้ว')
        } else if (acceptError.message?.includes('RIDE_NOT_FOUND')) {
          throw new Error('ไม่พบงานนี้')
        } else if (acceptError.message?.includes('PROVIDER_NOT_FOUND')) {
          throw new Error('ไม่พบข้อมูลผู้ให้บริการ')
        }
        throw acceptError
      }
      
      // Handle V3 atomic function response (returns JSON object)
      // vs old functions (returns array with { success, message, ride_data })
      let jobData: any
      let rideId: string
      
      if (type === 'ride' && data && typeof data === 'object' && !Array.isArray(data)) {
        // V3 atomic function returns JSON object: { success, ride_id, status, provider }
        if (!data.success) {
          throw new Error('ไม่สามารถรับงานได้')
        }
        rideId = data.ride_id
        
        // Fetch full ride details
        const { data: rideDetails, error: fetchError } = await (supabase
          .from('ride_requests') as any)
          .select(`
            *,
            users:user_id (
              id,
              first_name,
              last_name,
              phone_number
            )
          `)
          .eq('id', rideId)
          .single()
        
        if (fetchError || !rideDetails) throw new Error('ไม่สามารถโหลดข้อมูลงานได้')
        jobData = rideDetails
      } else {
        // Old functions return array: [{ success, message, ride_data }]
        const result = data?.[0]
        if (!result?.success) {
          throw new Error(result?.message || 'ไม่สามารถรับงานได้')
        }
        jobData = result.ride_data || result.delivery_data || result.shopping_data || result
        rideId = jobData.id
      }
      
      activeJob.value = {
        id: rideId,
        tracking_id: jobData.tracking_id || request.tracking_id,
        type,
        status: 'matched',
        customer: {
          id: jobData.users?.id || jobData.user_id,
          name: jobData.users ? `${jobData.users.first_name} ${jobData.users.last_name}`.trim() : 'ลูกค้า',
          phone: jobData.users?.phone_number || jobData.customer?.phone || '',
          rating: jobData.customer?.rating
        },
        pickup: {
          lat: jobData.pickup_lat || jobData.sender_lat,
          lng: jobData.pickup_lng || jobData.sender_lng,
          address: jobData.pickup_address || jobData.sender_address
        },
        destination: {
          lat: jobData.destination_lat || jobData.recipient_lat,
          lng: jobData.destination_lng || jobData.recipient_lng,
          address: jobData.destination_address || jobData.recipient_address
        },
        fare: jobData.estimated_fare || jobData.estimated_fee,
        created_at: jobData.created_at
      }

      // Remove from pending
      pendingRequests.value = pendingRequests.value.filter(r => r.id !== requestId)
      triggerRef(pendingRequests)

      // Subscribe to job updates
      subscribeToActiveJob(requestId, type)

      return { success: true }
    } catch (e: any) {
      // Rollback optimistic update
      pendingRequests.value = pendingRequests.value.map(r =>
        r.id === requestId ? { ...r, _accepting: false } : r
      )
      triggerRef(pendingRequests)
      
      return { success: false, error: e.message }
    }
  }

  // =====================================================
  // DECLINE REQUEST
  // =====================================================
  function declineRequest(requestId: string) {
    // Optimistic removal
    pendingRequests.value = pendingRequests.value.filter(r => r.id !== requestId)
    triggerRef(pendingRequests)
  }


  // =====================================================
  // UPDATE JOB STATUS
  // =====================================================
  async function updateJobStatus(status: string) {
    if (!activeJob.value) return { success: false, error: 'ไม่มีงานที่กำลังทำ' }

    const previousStatus = activeJob.value.status
    
    // Optimistic update
    activeJob.value = { ...activeJob.value, status }

    try {
      if (isDemoMode.value) {
        if (status === 'completed') {
          earnings.value.today += activeJob.value.fare
          earnings.value.todayTrips += 1
          
          // Clear after delay
          cleanup.addTimeout(window.setTimeout(() => {
            activeJob.value = null
          }, 2000))
        }
        return { success: true }
      }

      let rpcName = ''
      let params: Record<string, any> = { p_provider_id: profile.value?.id }

      switch (activeJob.value.type) {
        case 'ride':
          // Use direct table update for rides (V3 approach)
          const { error: updateError } = await (supabase
            .from('ride_requests') as any)
            .update({ 
              status,
              updated_at: new Date().toISOString()
            })
            .eq('id', activeJob.value.id)
            .eq('provider_id', profile.value?.id)
          
          if (updateError) throw updateError
          break
        case 'delivery':
          rpcName = 'update_delivery_status'
          params.p_delivery_id = activeJob.value.id
          params.p_new_status = status
          break
        case 'shopping':
          rpcName = 'update_shopping_status'
          params.p_shopping_id = activeJob.value.id
          params.p_new_status = status
          break
        case 'queue':
          rpcName = 'update_queue_status'
          params.p_booking_id = activeJob.value.id
          params.p_new_status = status
          break
        case 'moving':
          rpcName = 'update_moving_status'
          params.p_request_id = activeJob.value.id
          params.p_new_status = status
          break
        case 'laundry':
          rpcName = 'update_laundry_status'
          params.p_request_id = activeJob.value.id
          params.p_new_status = status
          break
      }

      // Only call RPC for non-ride types
      if (activeJob.value.type !== 'ride' && rpcName) {
        const { data, error: updateError } = await (supabase.rpc as any)(rpcName, params)
        
        if (updateError) throw updateError
        if (data?.[0] && !data[0].success) throw new Error(data[0].message)
      }

      if (status === 'completed') {
        earnings.value.today += activeJob.value.fare
        earnings.value.todayTrips += 1
        
        cleanup.addTimeout(window.setTimeout(() => {
          activeJob.value = null
          unsubscribeFromActiveJob()
        }, 2000))
      }

      return { success: true }
    } catch (e: any) {
      // Rollback
      if (activeJob.value) {
        activeJob.value = { ...activeJob.value, status: previousStatus }
      }
      return { success: false, error: e.message }
    }
  }

  // =====================================================
  // CANCEL ACTIVE JOB
  // =====================================================
  async function cancelActiveJob(reason?: string) {
    if (!activeJob.value) return { success: false }

    try {
      if (!isDemoMode.value) {
        const table = activeJob.value.type === 'ride' ? 'ride_requests' :
                      activeJob.value.type === 'delivery' ? 'delivery_requests' :
                      activeJob.value.type === 'shopping' ? 'shopping_requests' :
                      activeJob.value.type === 'queue' ? 'queue_bookings' :
                      activeJob.value.type === 'moving' ? 'moving_requests' : 'laundry_requests'

        await (supabase.from(table) as any)
          .update({ status: 'cancelled', cancel_reason: reason })
          .eq('id', activeJob.value.id)
      }

      activeJob.value = null
      unsubscribeFromActiveJob()
      return { success: true }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  }


  // =====================================================
  // REALTIME SUBSCRIPTIONS - Memory Safe
  // =====================================================
  let requestsChannel: any = null
  let activeJobChannel: any = null
  let pollingInterval: number | null = null

  function subscribeToAllRequests() {
    if (!profile.value?.id) return
    
    // Unsubscribe first to prevent duplicates
    unsubscribeFromRequests()

    requestsChannel = supabase.channel('provider_requests_' + profile.value.id)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'ride_requests'
      }, handleNewRequest)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'ride_requests'
      }, handleRequestUpdate)
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          networkStatus.value = 'reconnecting'
          scheduleReconnect()
        } else if (status === 'SUBSCRIBED') {
          networkStatus.value = 'online'
        }
      })

    cleanup.addSubscription(requestsChannel)

    // Polling fallback every 30s
    pollingInterval = window.setInterval(() => {
      if (isOnline.value && !activeJob.value) {
        fetchAllPendingRequests()
      }
    }, 30000)
    cleanup.addInterval(pollingInterval)
  }

  function handleNewRequest(payload: any) {
    const request = payload.new as any
    if (request.status !== 'pending' || request.provider_id) return

    // Check if already exists
    if (pendingRequests.value.some(r => r.id === request.id)) return

    const newRequest: PendingRequest = {
      id: request.id,
      tracking_id: request.tracking_id,
      type: 'ride',
      pickup_address: request.pickup_address,
      destination_address: request.destination_address,
      estimated_fare: request.estimated_fare || 0,
      customer_name: 'ผู้โดยสาร',
      created_at: request.created_at
    }

    pendingRequests.value = [newRequest, ...pendingRequests.value]
    triggerRef(pendingRequests)

    // Notify
    notifyNewRequest()
  }

  function handleRequestUpdate(payload: any) {
    const request = payload.new as any
    if (request.status !== 'pending' || request.provider_id) {
      pendingRequests.value = pendingRequests.value.filter(r => r.id !== request.id)
      triggerRef(pendingRequests)
    }
  }

  function subscribeToActiveJob(jobId: string, type: PendingRequest['type']) {
    unsubscribeFromActiveJob()

    const table = type === 'ride' ? 'ride_requests' :
                  type === 'delivery' ? 'delivery_requests' :
                  type === 'shopping' ? 'shopping_requests' :
                  type === 'queue' ? 'queue_bookings' :
                  type === 'moving' ? 'moving_requests' : 'laundry_requests'

    activeJobChannel = supabase.channel('active_job_' + jobId)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table,
        filter: `id=eq.${jobId}`
      }, (payload) => {
        const updated = payload.new as any
        if (activeJob.value?.id === jobId) {
          if (updated.status === 'cancelled') {
            activeJob.value = null
            unsubscribeFromActiveJob()
          } else {
            activeJob.value = { ...activeJob.value!, status: updated.status }
          }
        }
      })
      .subscribe()

    cleanup.addSubscription(activeJobChannel)
  }

  function unsubscribeFromRequests() {
    if (requestsChannel) {
      requestsChannel.unsubscribe()
      requestsChannel = null
    }
    if (pollingInterval) {
      clearInterval(pollingInterval)
      pollingInterval = null
    }
  }

  function unsubscribeFromActiveJob() {
    if (activeJobChannel) {
      activeJobChannel.unsubscribe()
      activeJobChannel = null
    }
  }

  function unsubscribeAll() {
    unsubscribeFromRequests()
    unsubscribeFromActiveJob()
  }

  let reconnectTimeout: number | null = null
  function scheduleReconnect() {
    if (reconnectTimeout) clearTimeout(reconnectTimeout)
    reconnectTimeout = window.setTimeout(() => {
      if (isOnline.value) {
        subscribeToAllRequests()
      }
    }, 5000)
    cleanup.addTimeout(reconnectTimeout)
  }


  // =====================================================
  // LOCATION UPDATES
  // =====================================================
  let locationInterval: number | null = null

  function startLocationUpdates() {
    if (!navigator.geolocation) return

    const updateLocation = async (lat: number, lng: number) => {
      if (!profile.value?.id || profile.value.id.startsWith('demo')) return
      
      try {
        await (supabase.from('service_providers') as any)
          .update({ current_lat: lat, current_lng: lng })
          .eq('id', profile.value.id)
        
        if (profile.value) {
          profile.value.current_lat = lat
          profile.value.current_lng = lng
        }
      } catch (e) {
        console.warn('Location update failed:', e)
      }
    }

    // Initial update
    navigator.geolocation.getCurrentPosition(
      (pos) => updateLocation(pos.coords.latitude, pos.coords.longitude),
      () => {},
      { enableHighAccuracy: true }
    )

    // Periodic updates
    locationInterval = window.setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (pos) => updateLocation(pos.coords.latitude, pos.coords.longitude),
        () => {},
        { enableHighAccuracy: true }
      )
    }, 30000)

    cleanup.addInterval(locationInterval)
  }

  function stopLocationUpdates() {
    if (locationInterval) {
      clearInterval(locationInterval)
      locationInterval = null
    }
  }

  // =====================================================
  // NOTIFICATIONS
  // =====================================================
  function notifyNewRequest() {
    // Vibrate
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200])
    }

    // Sound (optional)
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleQAA')
      audio.volume = 0.3
      audio.play().catch(() => {})
    } catch {}
  }

  // =====================================================
  // DEMO MODE SIMULATION
  // =====================================================
  let demoInterval: number | null = null

  function startDemoSimulation() {
    if (!isDemoMode.value) return

    const demoLocations = [
      { name: 'สยามพารากอน', lat: 13.7466, lng: 100.5347 },
      { name: 'เซ็นทรัลเวิลด์', lat: 13.7468, lng: 100.5392 },
      { name: 'MBK Center', lat: 13.7444, lng: 100.5300 },
      { name: 'Terminal 21', lat: 13.7377, lng: 100.5603 },
      { name: 'เอ็มควอเทียร์', lat: 13.7314, lng: 100.5697 }
    ]

    const demoNames = ['คุณสมชาย', 'คุณสมหญิง', 'คุณวิชัย', 'คุณนภา', 'คุณธนา']
    const types: PendingRequest['type'][] = ['ride', 'delivery', 'shopping']

    const generateRequest = (): PendingRequest => {
      const pickup = demoLocations[Math.floor(Math.random() * demoLocations.length)]!
      let dest = demoLocations[Math.floor(Math.random() * demoLocations.length)]!
      while (dest.name === pickup.name) {
        dest = demoLocations[Math.floor(Math.random() * demoLocations.length)]!
      }

      return {
        id: `demo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        tracking_id: `TR${Date.now().toString(36).toUpperCase()}`,
        type: types[Math.floor(Math.random() * types.length)]!,
        pickup_address: pickup.name,
        destination_address: dest.name,
        estimated_fare: Math.round(35 + Math.random() * 200),
        distance: Math.round((Math.random() * 8 + 2) * 10) / 10,
        customer_name: demoNames[Math.floor(Math.random() * demoNames.length)],
        customer_rating: Math.round((4 + Math.random()) * 10) / 10,
        created_at: new Date().toISOString()
      }
    }

    // Add initial request
    cleanup.addTimeout(window.setTimeout(() => {
      if (isOnline.value && pendingRequests.value.length < 3) {
        pendingRequests.value = [generateRequest(), ...pendingRequests.value]
        triggerRef(pendingRequests)
        notifyNewRequest()
      }
    }, 2000))

    // Periodic requests
    demoInterval = window.setInterval(() => {
      if (isOnline.value && !activeJob.value && pendingRequests.value.length < 3) {
        pendingRequests.value = [generateRequest(), ...pendingRequests.value]
        triggerRef(pendingRequests)
        notifyNewRequest()
      }
    }, 15000 + Math.random() * 15000)

    cleanup.addInterval(demoInterval)
  }

  function stopDemoSimulation() {
    if (demoInterval) {
      clearInterval(demoInterval)
      demoInterval = null
    }
  }

  // Watch online status for demo
  watch(isOnline, (online) => {
    if (isDemoMode.value) {
      if (online) startDemoSimulation()
      else stopDemoSimulation()
    }
  })


  // =====================================================
  // INITIALIZATION
  // =====================================================
  async function initialize() {
    loading.value = true
    
    try {
      const providerProfile = await fetchProfile()
      
      if (!providerProfile && !isDemoMode.value) {
        router.replace('/provider/onboarding')
        return false
      }

      // Check provider status
      if (providerProfile && !isDemoMode.value) {
        const status = providerProfile.status
        if (status === 'pending' || status === 'rejected') {
          router.replace('/provider/onboarding')
          return false
        }
      }

      // Fetch earnings in background
      fetchEarnings()

      // Start demo if already online
      if (isDemoMode.value && isOnline.value) {
        startDemoSimulation()
      }

      isInitialized.value = true
      return true
    } catch (e: any) {
      error.value = e.message
      return false
    } finally {
      loading.value = false
    }
  }

  // =====================================================
  // RESET STATE - For clean form submissions
  // =====================================================
  function resetFilters() {
    updateUrlParams({ tab: undefined, sort: undefined, search: undefined })
  }

  // =====================================================
  // CLEANUP ON UNMOUNT
  // =====================================================
  onUnmounted(() => {
    cleanup.cleanupAll()
    stopDemoSimulation()
    stopLocationUpdates()
  })

  // =====================================================
  // RETURN
  // =====================================================
  return {
    // State
    loading,
    error,
    isInitialized,
    networkStatus,
    profile,
    isOnline,
    pendingRequests,
    activeJob,
    earnings,
    
    // URL State
    currentTab,
    currentSort,
    searchQuery,
    
    // Computed
    filteredRequests,
    requestCounts,
    hasActiveJob,
    isDemoMode,
    
    // Actions
    initialize,
    fetchProfile,
    fetchEarnings,
    toggleOnline,
    fetchAllPendingRequests,
    acceptRequest,
    declineRequest,
    updateJobStatus,
    cancelActiveJob,
    resetFilters,
    
    // URL helpers
    updateUrlParams
  }
}
