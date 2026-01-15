/**
 * Provider Service - Unified State & Realtime Management
 * 
 * Architecture Goals:
 * - Single source of truth for provider state
 * - Centralized realtime subscription management
 * - Automatic reconnection with exponential backoff
 * - Consistent error handling
 * - Offline queue support
 */

import { ref, computed, shallowRef, readonly } from 'vue'
import { supabase } from '../lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

// =====================================================
// Types
// =====================================================
export interface ProviderProfile {
  id: string
  user_id: string
  status: 'pending' | 'approved' | 'active' | 'suspended'
  is_online: boolean
  is_available: boolean
  service_types: string[]
  primary_service?: string
  current_lat?: number
  current_lng?: number
  rating?: number
  total_trips?: number
  total_earnings?: number
  acceptance_rate?: number
  completion_rate?: number
  cancellation_rate?: number
}

export interface ProviderJob {
  id: string
  tracking_id?: string
  service_type: 'ride' | 'delivery' | 'shopping'
  status: 'pending' | 'matched' | 'pickup' | 'in_progress' | 'completed' | 'cancelled'
  customer_id: string
  provider_id?: string
  pickup_lat: number
  pickup_lng: number
  pickup_address: string
  destination_lat: number
  destination_lng: number
  destination_address: string
  estimated_fare: number
  estimated_distance?: number
  estimated_duration?: number
  notes?: string
  created_at: string
  accepted_at?: string
  arrived_at?: string
  started_at?: string
  completed_at?: string
  cancelled_at?: string
  // Computed fields
  distance_from_provider?: number
}

export interface ProviderLocation {
  latitude: number
  longitude: number
  accuracy?: number
  speed?: number
  heading?: number
  timestamp: number
}

export interface ServiceError {
  code: 'NETWORK' | 'AUTH' | 'NOT_FOUND' | 'CONFLICT' | 'VALIDATION' | 'UNKNOWN'
  message: string
  userMessage: string
  context?: Record<string, unknown>
}

type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'error'

// =====================================================
// Error Messages (Thai)
// =====================================================
const ERROR_MESSAGES: Record<ServiceError['code'], string> = {
  NETWORK: 'ไม่สามารถเชื่อมต่อได้ กรุณาตรวจสอบอินเทอร์เน็ต',
  AUTH: 'กรุณาเข้าสู่ระบบใหม่',
  NOT_FOUND: 'ไม่พบข้อมูลที่ต้องการ',
  CONFLICT: 'งานนี้ถูกรับไปแล้ว',
  VALIDATION: 'ข้อมูลไม่ถูกต้อง',
  UNKNOWN: 'เกิดข้อผิดพลาด กรุณาลองใหม่'
}

// =====================================================
// Service State (Singleton)
// =====================================================
const profile = shallowRef<ProviderProfile | null>(null)
const availableJobs = shallowRef<ProviderJob[]>([])
const currentJob = shallowRef<ProviderJob | null>(null)
const location = ref<ProviderLocation | null>(null)

const loading = ref(false)
const error = ref<ServiceError | null>(null)
const connectionStatus = ref<ConnectionStatus>('disconnected')

// Realtime management
let jobsChannel: RealtimeChannel | null = null
let profileChannel: RealtimeChannel | null = null
let reconnectAttempts = 0
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
const MAX_RECONNECT_ATTEMPTS = 5
const BASE_RECONNECT_DELAY = 1000

// Location tracking
let locationWatchId: number | null = null
let locationUpdateTimer: ReturnType<typeof setTimeout> | null = null
const LOCATION_UPDATE_INTERVAL = 10000 // 10 seconds

// Offline queue
const offlineQueue: Array<{ action: string; data: unknown; timestamp: number }> = []

// =====================================================
// Computed
// =====================================================
const isOnline = computed(() => profile.value?.is_online ?? false)
const isAvailable = computed(() => profile.value?.is_available ?? false)
const isVerified = computed(() => {
  const s = profile.value?.status
  return s === 'approved' || s === 'active'
})
const canAcceptJobs = computed(() => 
  isVerified.value && isOnline.value && isAvailable.value && !currentJob.value
)
const hasCurrentJob = computed(() => currentJob.value !== null)
const jobCount = computed(() => availableJobs.value.length)

// =====================================================
// Helper Functions
// =====================================================
function createError(
  code: ServiceError['code'],
  message: string,
  context?: Record<string, unknown>
): ServiceError {
  return {
    code,
    message,
    userMessage: ERROR_MESSAGES[code],
    context
  }
}

function clearError(): void {
  error.value = null
}

function calculateDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371 // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2) ** 2 + 
            Math.cos(lat1 * Math.PI / 180) * 
            Math.cos(lat2 * Math.PI / 180) * 
            Math.sin(dLng/2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}


// =====================================================
// Profile Management
// =====================================================
async function loadProfile(): Promise<ProviderProfile | null> {
  loading.value = true
  clearError()
  
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      error.value = createError('AUTH', 'Not authenticated')
      return null
    }

    const { data, error: queryError } = await supabase
      .from('providers_v2')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (queryError) {
      console.error('[ProviderService] loadProfile error:', queryError)
      error.value = createError('NETWORK', queryError.message)
      return null
    }

    if (data) {
      profile.value = data as ProviderProfile
      return profile.value
    }
    
    return null
  } catch (e) {
    console.error('[ProviderService] loadProfile exception:', e)
    error.value = createError('UNKNOWN', (e as Error).message)
    return null
  } finally {
    loading.value = false
  }
}

async function toggleOnlineStatus(): Promise<boolean> {
  if (!profile.value || !isVerified.value) return false
  
  loading.value = true
  clearError()
  const newStatus = !profile.value.is_online
  
  try {
    const { data, error: updateError } = await supabase
      .from('providers_v2')
      .update({ 
        is_online: newStatus,
        is_available: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', profile.value.id)
      .select()
      .single()

    if (updateError) {
      console.error('[ProviderService] toggleOnline error:', updateError)
      error.value = createError('NETWORK', updateError.message)
      return false
    }

    if (data) {
      profile.value = { ...profile.value, ...data } as ProviderProfile
      
      if (newStatus) {
        // Going online
        await startLocationTracking()
        await loadAvailableJobs()
        subscribeToJobs()
      } else {
        // Going offline
        stopLocationTracking()
        unsubscribeFromJobs()
        availableJobs.value = []
      }
      
      return true
    }
    
    return false
  } catch (e) {
    console.error('[ProviderService] toggleOnline exception:', e)
    error.value = createError('UNKNOWN', (e as Error).message)
    return false
  } finally {
    loading.value = false
  }
}

// =====================================================
// Job Management
// =====================================================
async function loadAvailableJobs(): Promise<ProviderJob[]> {
  if (!profile.value) return []
  
  clearError()
  
  try {
    const { data, error: queryError } = await supabase
      .from('ride_requests')
      .select(`
        id, tracking_id, service_type, status,
        user_id, provider_id,
        pickup_lat, pickup_lng, pickup_address,
        destination_lat, destination_lng, destination_address,
        estimated_fare, estimated_distance, estimated_duration,
        notes, created_at, scheduled_at
      `)
      .eq('status', 'pending')
      .is('provider_id', null)
      .order('created_at', { ascending: false })
      .limit(20)

    if (queryError) {
      console.error('[ProviderService] loadJobs error:', queryError)
      error.value = createError('NETWORK', queryError.message)
      return []
    }

    // Map and calculate distances
    const jobs: ProviderJob[] = ((data as Record<string, unknown>[]) || []).map(row => {
      const job: ProviderJob = {
        id: String(row.id),
        tracking_id: row.tracking_id as string | undefined,
        service_type: (row.service_type as ProviderJob['service_type']) || 'ride',
        status: 'pending',
        customer_id: String(row.user_id),
        provider_id: row.provider_id as string | undefined,
        pickup_lat: Number(row.pickup_lat) || 0,
        pickup_lng: Number(row.pickup_lng) || 0,
        pickup_address: String(row.pickup_address || ''),
        destination_lat: Number(row.destination_lat) || 0,
        destination_lng: Number(row.destination_lng) || 0,
        destination_address: String(row.destination_address || ''),
        estimated_fare: Number(row.estimated_fare) || 0,
        estimated_distance: row.estimated_distance as number | undefined,
        estimated_duration: row.estimated_duration as number | undefined,
        notes: row.notes as string | undefined,
        created_at: String(row.created_at)
      }
      
      // Calculate distance from provider
      if (location.value && job.pickup_lat && job.pickup_lng) {
        job.distance_from_provider = calculateDistance(
          location.value.latitude,
          location.value.longitude,
          job.pickup_lat,
          job.pickup_lng
        )
      }
      
      return job
    })

    // Sort by distance (nearest first)
    jobs.sort((a, b) => 
      (a.distance_from_provider ?? 999) - (b.distance_from_provider ?? 999)
    )

    availableJobs.value = jobs
    return jobs
  } catch (e) {
    console.error('[ProviderService] loadJobs exception:', e)
    error.value = createError('UNKNOWN', (e as Error).message)
    return []
  }
}

async function acceptJob(jobId: string): Promise<{ success: boolean; job?: ProviderJob; error?: ServiceError }> {
  if (!profile.value) {
    return { success: false, error: createError('AUTH', 'Not authenticated') }
  }
  
  if (!canAcceptJobs.value) {
    return { success: false, error: createError('VALIDATION', 'Cannot accept jobs') }
  }
  
  loading.value = true
  clearError()
  
  try {
    // Optimistic update - remove from list immediately
    const jobIndex = availableJobs.value.findIndex(j => j.id === jobId)
    const originalJobs = [...availableJobs.value]
    
    if (jobIndex >= 0) {
      availableJobs.value = availableJobs.value.filter(j => j.id !== jobId)
    }
    
    // Accept with race condition protection
    const { data, error: updateError } = await supabase
      .from('ride_requests')
      .update({
        provider_id: profile.value.id,
        status: 'matched',
        accepted_at: new Date().toISOString()
      })
      .eq('id', jobId)
      .eq('status', 'pending')
      .is('provider_id', null)
      .select()
      .single()

    if (updateError || !data) {
      // Rollback optimistic update
      availableJobs.value = originalJobs.filter(j => j.id !== jobId)
      
      const err = createError('CONFLICT', 'Job already taken')
      error.value = err
      return { success: false, error: err }
    }

    const row = data as Record<string, unknown>
    const job: ProviderJob = {
      id: String(row.id),
      tracking_id: row.tracking_id as string | undefined,
      service_type: (row.service_type as ProviderJob['service_type']) || 'ride',
      status: 'matched',
      customer_id: String(row.user_id),
      provider_id: profile.value.id,
      pickup_lat: Number(row.pickup_lat) || 0,
      pickup_lng: Number(row.pickup_lng) || 0,
      pickup_address: String(row.pickup_address || ''),
      destination_lat: Number(row.destination_lat) || 0,
      destination_lng: Number(row.destination_lng) || 0,
      destination_address: String(row.destination_address || ''),
      estimated_fare: Number(row.estimated_fare) || 0,
      estimated_distance: row.estimated_distance as number | undefined,
      estimated_duration: row.estimated_duration as number | undefined,
      notes: row.notes as string | undefined,
      created_at: String(row.created_at),
      accepted_at: row.accepted_at as string | undefined
    }

    currentJob.value = job
    
    // Update provider availability
    await supabase
      .from('providers_v2')
      .update({ is_available: false })
      .eq('id', profile.value.id)
    
    if (profile.value) {
      profile.value = { ...profile.value, is_available: false }
    }

    return { success: true, job }
  } catch (e) {
    console.error('[ProviderService] acceptJob exception:', e)
    const err = createError('UNKNOWN', (e as Error).message)
    error.value = err
    return { success: false, error: err }
  } finally {
    loading.value = false
  }
}

async function updateJobStatus(
  jobId: string,
  newStatus: ProviderJob['status'],
  notes?: string
): Promise<{ success: boolean; error?: ServiceError }> {
  if (!currentJob.value || currentJob.value.id !== jobId) {
    return { success: false, error: createError('NOT_FOUND', 'Job not found') }
  }
  
  loading.value = true
  clearError()
  
  try {
    const updates: Record<string, unknown> = {
      status: newStatus,
      updated_at: new Date().toISOString()
    }
    
    // Add timestamps based on status
    const now = new Date().toISOString()
    switch (newStatus) {
      case 'pickup':
        updates.arrived_at = now
        break
      case 'in_progress':
        updates.started_at = now
        break
      case 'completed':
        updates.completed_at = now
        break
      case 'cancelled':
        updates.cancelled_at = now
        if (notes) updates.cancellation_reason = notes
        break
    }

    const { error: updateError } = await supabase
      .from('ride_requests')
      .update(updates)
      .eq('id', jobId)

    if (updateError) {
      console.error('[ProviderService] updateStatus error:', updateError)
      const err = createError('NETWORK', updateError.message)
      error.value = err
      return { success: false, error: err }
    }

    // Update local state
    currentJob.value = { ...currentJob.value, status: newStatus }
    
    // Clear current job if completed/cancelled
    if (newStatus === 'completed' || newStatus === 'cancelled') {
      currentJob.value = null
      
      // Restore availability
      if (profile.value) {
        await supabase
          .from('providers_v2')
          .update({ is_available: true })
          .eq('id', profile.value.id)
        
        profile.value = { ...profile.value, is_available: true }
      }
    }

    return { success: true }
  } catch (e) {
    console.error('[ProviderService] updateStatus exception:', e)
    const err = createError('UNKNOWN', (e as Error).message)
    error.value = err
    return { success: false, error: err }
  } finally {
    loading.value = false
  }
}

async function loadCurrentJob(): Promise<ProviderJob | null> {
  if (!profile.value) return null
  
  try {
    const { data } = await supabase
      .from('ride_requests')
      .select('*')
      .eq('provider_id', profile.value.id)
      .in('status', ['matched', 'pickup', 'in_progress'])
      .order('accepted_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!data) {
      currentJob.value = null
      return null
    }

    const row = data as Record<string, unknown>
    const job: ProviderJob = {
      id: String(row.id),
      tracking_id: row.tracking_id as string | undefined,
      service_type: (row.service_type as ProviderJob['service_type']) || 'ride',
      status: row.status as ProviderJob['status'],
      customer_id: String(row.user_id),
      provider_id: profile.value.id,
      pickup_lat: Number(row.pickup_lat) || 0,
      pickup_lng: Number(row.pickup_lng) || 0,
      pickup_address: String(row.pickup_address || ''),
      destination_lat: Number(row.destination_lat) || 0,
      destination_lng: Number(row.destination_lng) || 0,
      destination_address: String(row.destination_address || ''),
      estimated_fare: Number(row.estimated_fare) || 0,
      estimated_distance: row.estimated_distance as number | undefined,
      estimated_duration: row.estimated_duration as number | undefined,
      notes: row.notes as string | undefined,
      created_at: String(row.created_at),
      accepted_at: row.accepted_at as string | undefined,
      arrived_at: row.arrived_at as string | undefined,
      started_at: row.started_at as string | undefined
    }

    currentJob.value = job
    return job
  } catch (e) {
    console.error('[ProviderService] loadCurrentJob exception:', e)
    return null
  }
}


// =====================================================
// Realtime Subscriptions with Auto-Reconnect
// =====================================================
function subscribeToJobs(): void {
  if (jobsChannel) {
    supabase.removeChannel(jobsChannel)
  }
  
  connectionStatus.value = 'connecting'
  reconnectAttempts = 0
  
  jobsChannel = supabase
    .channel('provider-jobs-unified')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'ride_requests',
      filter: 'status=eq.pending'
    }, handleNewJob)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'ride_requests'
    }, handleJobUpdate)
    .subscribe((status) => {
      console.log('[ProviderService] Realtime status:', status)
      
      if (status === 'SUBSCRIBED') {
        connectionStatus.value = 'connected'
        reconnectAttempts = 0
      } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
        connectionStatus.value = 'disconnected'
        scheduleReconnect()
      }
    })
}

function handleNewJob(payload: { new: Record<string, unknown> }): void {
  const row = payload.new
  
  // Check if already in list
  if (availableJobs.value.some(j => j.id === row.id)) return
  
  const job: ProviderJob = {
    id: String(row.id),
    tracking_id: row.tracking_id as string | undefined,
    service_type: (row.service_type as ProviderJob['service_type']) || 'ride',
    status: 'pending',
    customer_id: String(row.user_id),
    pickup_lat: Number(row.pickup_lat) || 0,
    pickup_lng: Number(row.pickup_lng) || 0,
    pickup_address: String(row.pickup_address || ''),
    destination_lat: Number(row.destination_lat) || 0,
    destination_lng: Number(row.destination_lng) || 0,
    destination_address: String(row.destination_address || ''),
    estimated_fare: Number(row.estimated_fare) || 0,
    estimated_distance: row.estimated_distance as number | undefined,
    estimated_duration: row.estimated_duration as number | undefined,
    created_at: String(row.created_at)
  }
  
  // Calculate distance
  if (location.value && job.pickup_lat && job.pickup_lng) {
    job.distance_from_provider = calculateDistance(
      location.value.latitude,
      location.value.longitude,
      job.pickup_lat,
      job.pickup_lng
    )
  }
  
  // Add to list and sort
  const newJobs = [job, ...availableJobs.value]
  newJobs.sort((a, b) => 
    (a.distance_from_provider ?? 999) - (b.distance_from_provider ?? 999)
  )
  availableJobs.value = newJobs
  
  console.log('[ProviderService] New job added:', job.id)
}

function handleJobUpdate(payload: { new: Record<string, unknown> }): void {
  const row = payload.new
  const jobId = String(row.id)
  
  // Remove from available if taken
  if (row.provider_id || row.status !== 'pending') {
    availableJobs.value = availableJobs.value.filter(j => j.id !== jobId)
  }
  
  // Update current job if it's ours
  if (currentJob.value?.id === jobId) {
    currentJob.value = {
      ...currentJob.value,
      status: row.status as ProviderJob['status']
    }
  }
}

function scheduleReconnect(): void {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
  }
  
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.error('[ProviderService] Max reconnect attempts reached')
    connectionStatus.value = 'error'
    error.value = createError('NETWORK', 'Connection lost')
    return
  }
  
  const delay = BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttempts)
  reconnectAttempts++
  
  console.log(`[ProviderService] Reconnecting in ${delay}ms (attempt ${reconnectAttempts})`)
  
  reconnectTimer = setTimeout(() => {
    if (profile.value?.is_online) {
      subscribeToJobs()
    }
  }, delay)
}

function unsubscribeFromJobs(): void {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  
  if (jobsChannel) {
    supabase.removeChannel(jobsChannel)
    jobsChannel = null
  }
  
  connectionStatus.value = 'disconnected'
}

// =====================================================
// Location Tracking
// =====================================================
async function startLocationTracking(): Promise<void> {
  if (!navigator.geolocation) {
    console.warn('[ProviderService] Geolocation not supported')
    return
  }
  
  // Get initial position
  navigator.geolocation.getCurrentPosition(
    handleLocationSuccess,
    handleLocationError,
    { enableHighAccuracy: true, timeout: 10000 }
  )
  
  // Watch position
  locationWatchId = navigator.geolocation.watchPosition(
    handleLocationSuccess,
    handleLocationError,
    { enableHighAccuracy: true, maximumAge: 5000 }
  )
}

function handleLocationSuccess(position: GeolocationPosition): void {
  const newLocation: ProviderLocation = {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy: position.coords.accuracy,
    speed: position.coords.speed ?? undefined,
    heading: position.coords.heading ?? undefined,
    timestamp: position.timestamp
  }
  
  location.value = newLocation
  
  // Throttle database updates
  if (!locationUpdateTimer) {
    locationUpdateTimer = setTimeout(() => {
      updateProviderLocation(newLocation)
      locationUpdateTimer = null
    }, LOCATION_UPDATE_INTERVAL)
  }
  
  // Recalculate job distances
  if (availableJobs.value.length > 0) {
    const updatedJobs = availableJobs.value.map(job => ({
      ...job,
      distance_from_provider: calculateDistance(
        newLocation.latitude,
        newLocation.longitude,
        job.pickup_lat,
        job.pickup_lng
      )
    }))
    updatedJobs.sort((a, b) => 
      (a.distance_from_provider ?? 999) - (b.distance_from_provider ?? 999)
    )
    availableJobs.value = updatedJobs
  }
}

function handleLocationError(error: GeolocationPositionError): void {
  console.warn('[ProviderService] Location error:', error.message)
}

async function updateProviderLocation(loc: ProviderLocation): Promise<void> {
  if (!profile.value) return
  
  try {
    // Update provider_locations table
    await supabase
      .from('provider_locations')
      .upsert({
        provider_id: profile.value.id,
        latitude: loc.latitude,
        longitude: loc.longitude,
        accuracy: loc.accuracy,
        speed: loc.speed,
        heading: loc.heading,
        updated_at: new Date().toISOString()
      }, { onConflict: 'provider_id' })
    
    // Update providers_v2 current location
    await supabase
      .from('providers_v2')
      .update({
        current_lat: loc.latitude,
        current_lng: loc.longitude,
        updated_at: new Date().toISOString()
      })
      .eq('id', profile.value.id)
      
  } catch (e) {
    console.error('[ProviderService] updateLocation error:', e)
  }
}

function stopLocationTracking(): void {
  if (locationWatchId !== null) {
    navigator.geolocation.clearWatch(locationWatchId)
    locationWatchId = null
  }
  
  if (locationUpdateTimer) {
    clearTimeout(locationUpdateTimer)
    locationUpdateTimer = null
  }
}

// =====================================================
// Initialization & Cleanup
// =====================================================
async function initialize(): Promise<void> {
  await loadProfile()
  
  if (profile.value?.is_online) {
    await startLocationTracking()
    await loadCurrentJob()
    await loadAvailableJobs()
    subscribeToJobs()
  }
}

function cleanup(): void {
  stopLocationTracking()
  unsubscribeFromJobs()
  
  if (profileChannel) {
    supabase.removeChannel(profileChannel)
    profileChannel = null
  }
  
  profile.value = null
  availableJobs.value = []
  currentJob.value = null
  location.value = null
  error.value = null
  loading.value = false
}

// =====================================================
// Export Service
// =====================================================
export const providerService = {
  // State (readonly)
  profile: readonly(profile),
  availableJobs: readonly(availableJobs),
  currentJob: readonly(currentJob),
  location: readonly(location),
  loading: readonly(loading),
  error: readonly(error),
  connectionStatus: readonly(connectionStatus),
  
  // Computed
  isOnline,
  isAvailable,
  isVerified,
  canAcceptJobs,
  hasCurrentJob,
  jobCount,
  
  // Actions
  initialize,
  loadProfile,
  toggleOnlineStatus,
  loadAvailableJobs,
  acceptJob,
  updateJobStatus,
  loadCurrentJob,
  startLocationTracking,
  stopLocationTracking,
  subscribeToJobs,
  unsubscribeFromJobs,
  clearError,
  cleanup
}

export type ProviderService = typeof providerService
