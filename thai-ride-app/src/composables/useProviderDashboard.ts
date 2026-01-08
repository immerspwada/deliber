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
import { providerLogger } from '../lib/logger'

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
// LOCAL STORAGE CACHE - Persist active job across refresh
// =====================================================
const ACTIVE_JOB_CACHE_KEY = 'provider_active_job_cache'
const CACHE_EXPIRY_MS = 4 * 60 * 60 * 1000 // 4 hours

interface CachedActiveJob {
  job: ActiveJob
  cachedAt: number
  providerId: string
}

function saveActiveJobToCache(job: ActiveJob | null, providerId: string) {
  if (!job) {
    localStorage.removeItem(ACTIVE_JOB_CACHE_KEY)
    return
  }
  
  const cached: CachedActiveJob = {
    job,
    cachedAt: Date.now(),
    providerId
  }
  
  try {
    localStorage.setItem(ACTIVE_JOB_CACHE_KEY, JSON.stringify(cached))
    providerLogger.debug('Saved active job to cache:', job.tracking_id)
  } catch (e) {
    providerLogger.warn('Failed to save to localStorage:', e)
  }
}

function loadActiveJobFromCache(providerId: string): ActiveJob | null {
  try {
    const cached = localStorage.getItem(ACTIVE_JOB_CACHE_KEY)
    if (!cached) return null
    
    const parsed: CachedActiveJob = JSON.parse(cached)
    
    // Check if cache is expired
    if (Date.now() - parsed.cachedAt > CACHE_EXPIRY_MS) {
      providerLogger.debug('Cache expired, clearing')
      localStorage.removeItem(ACTIVE_JOB_CACHE_KEY)
      return null
    }
    
    // Check if cache belongs to current provider
    if (parsed.providerId !== providerId) {
      providerLogger.debug('Cache belongs to different provider, clearing')
      localStorage.removeItem(ACTIVE_JOB_CACHE_KEY)
      return null
    }
    
    providerLogger.debug('Loaded active job from cache:', parsed.job.tracking_id)
    return parsed.job
  } catch (e) {
    providerLogger.warn('Failed to load from localStorage:', e)
    return null
  }
}

function clearActiveJobCache() {
  localStorage.removeItem(ACTIVE_JOB_CACHE_KEY)
  providerLogger.debug('Cache cleared')
}

// =====================================================
// SINGLETON STATE - Shared across all component instances
// This ensures activeJob state is consistent across the app
// =====================================================
const singletonState = {
  loading: ref(false),
  error: ref<string | null>(null),
  isInitialized: ref(false),
  networkStatus: ref<'online' | 'offline' | 'reconnecting'>('online'),
  profile: ref<ProviderProfile | null>(null),
  isOnline: ref(false),
  pendingRequests: shallowRef<PendingRequest[]>([]),
  activeJob: ref<ActiveJob | null>(null),
  earnings: ref<EarningsSummary>({
    today: 0, thisWeek: 0, thisMonth: 0,
    todayTrips: 0, weekTrips: 0, monthTrips: 0
  })
}

// Singleton cleanup registry
const singletonCleanup = new CleanupRegistry()

// =====================================================
// MAIN COMPOSABLE
// =====================================================
export function useProviderDashboard() {
  const router = useRouter()
  const route = useRoute()
  const authStore = useAuthStore()
  
  // Use singleton state instead of creating new refs
  const {
    loading,
    error,
    isInitialized,
    networkStatus,
    profile,
    isOnline,
    pendingRequests,
    activeJob,
    earnings
  } = singletonState
  
  const cleanup = singletonCleanup

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


  // =====================================================
  // FETCH PROFILE - With Retry
  // =====================================================
  async function fetchProfile(): Promise<ProviderProfile | null> {
    loading.value = true
    error.value = null
    
    try {
      if (!authStore.user?.id) {
        profile.value = null
        return null
      }

      const data = await retryWithBackoff(async () => {
        // Use maybeSingle() to avoid 406 error when user is not a provider
        const { data, error: fetchError } = await (supabase
          .from('service_providers') as any)
          .select('*')
          .eq('user_id', authStore.user!.id)
          .maybeSingle()
        
        if (fetchError) throw fetchError
        return data
      })

      // User is not a provider yet
      if (!data) {
        profile.value = null
        isOnline.value = false
        return null
      }

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
      providerLogger.warn('Error fetching earnings:', e)
    }
  }


  // =====================================================
  // TOGGLE ONLINE STATUS - Production Ready (Direct Update First)
  // =====================================================
  async function toggleOnline(online: boolean, location?: { lat: number; lng: number }) {
    loading.value = true
    error.value = null
    
    // Optimistic update
    const previousState = isOnline.value
    isOnline.value = online

    try {
      if (!profile.value?.id) await fetchProfile()
      if (!profile.value?.id) throw new Error('ไม่พบข้อมูลผู้ให้บริการ กรุณาสมัครเป็นผู้ให้บริการก่อน')
      
      // Check provider status before going online - be more lenient
      const providerStatus = profile.value.status || ''
      const isVerified = profile.value.is_verified || false
      const canGoOnline = ['approved', 'active', 'pending'].includes(providerStatus) || isVerified
      
      providerLogger.debug('Status check:', { status: providerStatus, isVerified, canGoOnline })
      
      if (online && !canGoOnline) {
        throw new Error('บัญชียังไม่ได้รับการอนุมัติ กรุณารอ Admin ตรวจสอบ')
      }
      
      providerLogger.debug('Toggling online:', online, 'Provider ID:', profile.value.id)

      // PRIMARY METHOD: Direct table update (most reliable)
      providerLogger.debug('Using direct update method')
      const { error: directError } = await (supabase
        .from('service_providers') as any)
        .update({
          is_available: online,
          current_lat: location?.lat || null,
          current_lng: location?.lng || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.value.id)
      
      if (directError) {
        providerLogger.error('Direct update failed:', directError)
        
        // FALLBACK: Try RPC function
        try {
          const { data: toggleData, error: toggleError } = await (supabase.rpc as any)('toggle_provider_online', {
            p_user_id: authStore.user?.id,
            p_is_online: online,
            p_lat: location?.lat || null,
            p_lng: location?.lng || null
          })
          
          if (toggleError || !toggleData?.success) {
            throw new Error(toggleData?.error || toggleError?.message || 'ไม่สามารถเปลี่ยนสถานะได้')
          }
          providerLogger.debug('Toggle success via RPC fallback')
        } catch (rpcErr: any) {
          providerLogger.error('RPC fallback also failed:', rpcErr)
          throw new Error(directError.message || 'ไม่สามารถเปลี่ยนสถานะได้')
        }
      } else {
        providerLogger.debug('Toggle success via direct update')
      }

      // Update local profile
      if (profile.value) {
        profile.value.is_available = online
        if (location) {
          profile.value.current_lat = location.lat
          profile.value.current_lng = location.lng
        }
      }

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
  // FETCH ALL PENDING REQUESTS - Production Ready
  // =====================================================
  async function fetchAllPendingRequests() {
    if (!profile.value?.id) return

    try {
      const results: PendingRequest[] = []

      // Method 1: Try RPC function first (more efficient)
      try {
        const { data: rpcRides, error: rpcError } = await (supabase.rpc as any)(
          'get_available_rides_for_provider',
          { p_provider_id: profile.value.id, p_radius_km: 15 }
        )
        
        if (!rpcError && rpcRides?.length) {
          results.push(...rpcRides.map((r: any) => ({
            id: r.ride_id,
            tracking_id: r.tracking_id,
            type: 'ride' as const,
            pickup_address: r.pickup_address,
            destination_address: r.destination_address,
            estimated_fare: r.estimated_fare || 0,
            distance: r.ride_distance,
            customer_name: r.passenger_name || 'ผู้โดยสาร',
            customer_rating: r.passenger_rating,
            created_at: r.created_at
          })))
        }
      } catch (rpcErr) {
        providerLogger.warn('RPC failed, falling back to direct query:', rpcErr)
      }

      // Method 2: Fallback to direct query if RPC fails or returns empty
      if (results.filter(r => r.type === 'ride').length === 0) {
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
            destination_lat,
            destination_lng,
            created_at,
            users:user_id (
              first_name,
              last_name,
              phone_number
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
            distance: r.pickup_lat && r.destination_lat ? calculateDistance(
              r.pickup_lat, r.pickup_lng, r.destination_lat, r.destination_lng
            ) : undefined,
            customer_name: r.users ? `${r.users.first_name || ''} ${r.users.last_name || ''}`.trim() || 'ผู้โดยสาร' : 'ผู้โดยสาร',
            customer_rating: 4.5,
            created_at: r.created_at
          })))
        }
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
          sender_lat,
          sender_lng,
          recipient_lat,
          recipient_lng,
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
          distance: d.sender_lat && d.recipient_lat ? calculateDistance(
            d.sender_lat, d.sender_lng, d.recipient_lat, d.recipient_lng
          ) : undefined,
          customer_name: d.users ? `${d.users.first_name || ''} ${d.users.last_name || ''}`.trim() || 'ลูกค้า' : 'ลูกค้า',
          created_at: d.created_at
        })))
      }

      // Fetch shopping requests
      const { data: shopping } = await (supabase
        .from('shopping_requests') as any)
        .select(`
          id,
          tracking_id,
          store_name,
          store_address,
          delivery_address,
          service_fee,
          budget_limit,
          items,
          item_list,
          store_lat,
          store_lng,
          delivery_lat,
          delivery_lng,
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
      
      if (shopping?.length) {
        results.push(...shopping.map((s: any) => ({
          id: s.id,
          tracking_id: s.tracking_id,
          type: 'shopping' as const,
          pickup_address: s.store_address || s.store_name || 'ร้านค้า',
          destination_address: s.delivery_address,
          estimated_fare: s.service_fee || 0,
          distance: s.store_lat && s.delivery_lat ? calculateDistance(
            s.store_lat, s.store_lng, s.delivery_lat, s.delivery_lng
          ) : undefined,
          customer_name: s.users ? `${s.users.first_name || ''} ${s.users.last_name || ''}`.trim() || 'ลูกค้า' : 'ลูกค้า',
          created_at: s.created_at
        })))
      }

      // Sort by created_at descending
      results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      // Update with shallow ref trigger
      pendingRequests.value = results
      triggerRef(pendingRequests)
      
      providerLogger.debug(`Fetched ${results.length} pending requests (${results.filter(r => r.type === 'ride').length} rides, ${results.filter(r => r.type === 'delivery').length} deliveries, ${results.filter(r => r.type === 'shopping').length} shopping)`)
    } catch (e) {
      providerLogger.warn('Error fetching requests:', e)
    }
  }

  // Helper function to calculate distance
  function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371 // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng/2)**2
    return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)) * 10) / 10
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

      if (rpcName === '') {
        throw new Error('ประเภทงานไม่ถูกต้อง')
      }

      let jobData: any
      let rideId: string = requestId

      // For rides, use retry mechanism with direct update
      if (type === 'ride') {
        providerLogger.debug('Accepting ride via direct update with retry:', requestId)
        
        // Wrap the acceptance logic in retry mechanism
        const acceptRideWithRetry = async () => {
          // Step 1: Check if ride is still available
          const { data: rideCheck, error: checkError } = await (supabase
            .from('ride_requests') as any)
            .select('status, provider_id')
            .eq('id', requestId)
            .single()
          
          if (checkError || !rideCheck) {
            throw new Error('ไม่พบงานนี้')
          }
          
          if (rideCheck.status !== 'pending' || rideCheck.provider_id) {
            // Don't retry if already accepted - this is a permanent failure
            const err = new Error('งานนี้ถูกรับไปแล้ว')
            ;(err as any).noRetry = true
            throw err
          }
          
          // Step 2: Update ride to matched
          const { error: updateError } = await (supabase
            .from('ride_requests') as any)
            .update({
              status: 'matched',
              provider_id: profile.value!.id,
              matched_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', requestId)
            .eq('status', 'pending') // Double-check status to prevent race condition
            .is('provider_id', null)
          
          if (updateError) {
            providerLogger.error('Direct update failed:', updateError)
            throw new Error('ไม่สามารถรับงานได้: ' + updateError.message)
          }
          
          // Step 3: Update provider to busy
          await (supabase
            .from('service_providers') as any)
            .update({
              is_available: false,
              updated_at: new Date().toISOString()
            })
            .eq('id', profile.value!.id)
          
          // Step 4: Fetch full ride details
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
            .eq('id', requestId)
            .single()
          
          if (fetchError || !rideDetails) {
            throw new Error('ไม่สามารถโหลดข้อมูลงานได้')
          }
          
          // Verify the update was successful
          if (rideDetails.provider_id !== profile.value!.id) {
            const err = new Error('งานนี้ถูกรับไปแล้วโดยคนอื่น')
            ;(err as any).noRetry = true
            throw err
          }
          
          return rideDetails
        }
        
        // Execute with retry (3 attempts, 500ms base delay)
        try {
          jobData = await retryWithBackoff(acceptRideWithRetry, 3, 500)
          providerLogger.debug('Ride accepted successfully')
        } catch (retryError: any) {
          // If marked as noRetry, throw immediately without retry message
          if (retryError.noRetry) {
            throw retryError
          }
          // Otherwise, throw with retry exhausted message
          throw new Error(retryError.message || 'ไม่สามารถรับงานได้ กรุณาลองใหม่')
        }
      } else {
        // For other service types, use RPC functions
        const { data, error: acceptError } = await (supabase.rpc as any)(rpcName, params)
        
        if (acceptError) {
          // Handle specific error messages from atomic functions
          if (acceptError.message?.includes('RIDE_ALREADY_ACCEPTED') || acceptError.message?.includes('ถูกรับไปแล้ว')) {
            throw new Error('งานนี้ถูกรับไปแล้ว')
          } else if (acceptError.message?.includes('RIDE_NOT_FOUND') || acceptError.message?.includes('ไม่พบ')) {
            throw new Error('ไม่พบงานนี้')
          } else if (acceptError.message?.includes('PROVIDER_NOT_FOUND')) {
            throw new Error('ไม่พบข้อมูลผู้ให้บริการ')
          }
          throw acceptError
        }
        
        // Handle response from RPC functions
        if (data && typeof data === 'object' && !Array.isArray(data)) {
          // JSON object response
          if (!data.success) {
            throw new Error(data.message || 'ไม่สามารถรับงานได้')
          }
          jobData = data.delivery_data || data.shopping_data || data
          rideId = jobData.id || requestId
        } else if (Array.isArray(data) && data[0]) {
          // Array response: [{ success, message, *_data }]
          const result = data[0]
          if (!result.success) {
            throw new Error(result.message || 'ไม่สามารถรับงานได้')
          }
          jobData = result.delivery_data || result.shopping_data || result
          rideId = jobData.id || requestId
        } else {
          throw new Error('ไม่สามารถรับงานได้')
        }
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
      
      // Save to localStorage cache for persistence across refresh
      if (profile.value?.id) {
        saveActiveJobToCache(activeJob.value, profile.value.id)
      }
      
      // Debug log
      providerLogger.debug('activeJob set:', activeJob.value)
      providerLogger.debug('hasActiveJob computed:', activeJob.value !== null)

      // Remove from pending
      pendingRequests.value = pendingRequests.value.filter(r => r.id !== requestId)
      triggerRef(pendingRequests)

      // Subscribe to job updates - use rideId (the actual job ID)
      subscribeToActiveJob(rideId, type)

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
        
        // Clear cache when job is completed
        clearActiveJobCache()
        
        cleanup.addTimeout(window.setTimeout(() => {
          activeJob.value = null
          unsubscribeFromActiveJob()
        }, 2000))
      } else {
        // Update cache with new status
        if (profile.value?.id && activeJob.value) {
          saveActiveJobToCache(activeJob.value, profile.value.id)
        }
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
      const table = activeJob.value.type === 'ride' ? 'ride_requests' :
                    activeJob.value.type === 'delivery' ? 'delivery_requests' :
                    activeJob.value.type === 'shopping' ? 'shopping_requests' :
                    activeJob.value.type === 'queue' ? 'queue_bookings' :
                    activeJob.value.type === 'moving' ? 'moving_requests' : 'laundry_requests'

      await (supabase.from(table) as any)
        .update({ status: 'cancelled', cancel_reason: reason })
        .eq('id', activeJob.value.id)

      activeJob.value = null
      clearActiveJobCache() // Clear cache when job is cancelled
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
      // Ride requests
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'ride_requests'
      }, (payload) => handleNewRequest(payload, 'ride'))
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'ride_requests'
      }, handleRequestUpdate)
      // Delivery requests
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'delivery_requests'
      }, (payload) => handleNewRequest(payload, 'delivery'))
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'delivery_requests'
      }, handleRequestUpdate)
      // Shopping requests
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'shopping_requests'
      }, (payload) => handleNewRequest(payload, 'shopping'))
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'shopping_requests'
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

  function handleNewRequest(payload: any, type: 'ride' | 'delivery' | 'shopping' = 'ride') {
    const request = payload.new as any
    if (request.status !== 'pending' || request.provider_id) return

    // Check if already exists
    if (pendingRequests.value.some(r => r.id === request.id)) return

    let newRequest: PendingRequest

    if (type === 'ride') {
      newRequest = {
        id: request.id,
        tracking_id: request.tracking_id,
        type: 'ride',
        pickup_address: request.pickup_address,
        destination_address: request.destination_address,
        estimated_fare: request.estimated_fare || 0,
        customer_name: 'ผู้โดยสาร',
        created_at: request.created_at
      }
    } else if (type === 'delivery') {
      newRequest = {
        id: request.id,
        tracking_id: request.tracking_id,
        type: 'delivery',
        pickup_address: request.sender_address,
        destination_address: request.recipient_address,
        estimated_fare: request.estimated_fee || 0,
        customer_name: 'ลูกค้า',
        created_at: request.created_at
      }
    } else {
      // shopping
      newRequest = {
        id: request.id,
        tracking_id: request.tracking_id,
        type: 'shopping',
        pickup_address: request.store_address || request.store_name || 'ร้านค้า',
        destination_address: request.delivery_address,
        estimated_fare: request.service_fee || 0,
        customer_name: 'ลูกค้า',
        created_at: request.created_at
      }
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
        providerLogger.warn('Location update failed:', e)
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
  // INITIALIZATION
  // =====================================================
  async function initialize() {
    loading.value = true
    
    try {
      const providerProfile = await fetchProfile()
      
      if (!providerProfile) {
        router.replace('/provider/onboarding')
        return false
      }

      // Check provider status
      if (providerProfile) {
        const status = providerProfile.status
        if (status === 'pending' || status === 'rejected') {
          router.replace('/provider/onboarding')
          return false
        }
        
        // Load cached active job and verify with database
        const cachedJob = loadActiveJobFromCache(providerProfile.id)
        if (cachedJob) {
          // Verify the job is still active in database
          const isStillActive = await verifyActiveJobFromDatabase(cachedJob.id, cachedJob.type)
          if (isStillActive) {
            activeJob.value = cachedJob
            providerLogger.debug('Restored active job from cache:', cachedJob.tracking_id)
            // Re-subscribe to job updates
            subscribeToActiveJob(cachedJob.id, cachedJob.type)
          } else {
            // Job is no longer active, clear cache
            clearActiveJobCache()
            providerLogger.debug('Cached job no longer active, cleared cache')
          }
        }
      }

      // Fetch earnings in background
      fetchEarnings()

      isInitialized.value = true
      return true
    } catch (e: any) {
      error.value = e.message
      return false
    } finally {
      loading.value = false
    }
  }
  
  // Verify if cached job is still active in database
  async function verifyActiveJobFromDatabase(jobId: string, type: string): Promise<boolean> {
    try {
      const table = type === 'ride' ? 'ride_requests' :
                    type === 'delivery' ? 'delivery_requests' :
                    type === 'shopping' ? 'shopping_requests' :
                    type === 'queue' ? 'queue_bookings' :
                    type === 'moving' ? 'moving_requests' : 'laundry_requests'
      
      const { data, error: fetchError } = await (supabase
        .from(table) as any)
        .select('status, provider_id')
        .eq('id', jobId)
        .single()
      
      if (fetchError || !data) return false
      
      // Job is active if status is not completed/cancelled and belongs to this provider
      const activeStatuses = ['matched', 'arriving', 'arrived', 'picked_up', 'in_progress', 'pickup', 'in_transit', 'shopping', 'delivering']
      return activeStatuses.includes(data.status) && data.provider_id === profile.value?.id
    } catch (e) {
      providerLogger.warn('verifyActiveJob Error:', e)
      return false
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
    stopLocationUpdates()
  })

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
    cleanup,
    
    // URL helpers
    updateUrlParams
  }
}
