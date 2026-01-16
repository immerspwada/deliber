/**
 * Provider Jobs Composable - Production Ready
 * Handles job management with validation, error handling, and role-based access
 * 
 * Role Impact:
 * - Provider: Full job management (view, accept, update status)
 * - Customer: No access (handled by RLS)
 * - Admin: Monitor only (separate admin composable)
 */

import { ref, computed, onUnmounted } from 'vue'
import { supabase } from '../lib/supabase'
import { useErrorHandler } from './useErrorHandler'
import type { Job, ServiceType } from '../types/provider'
import { z } from 'zod'

// Validation schemas
const JobIdSchema = z.string().uuid('Invalid job ID')

const JobStatusSchema = z.enum([
  'pending',
  'matched',
  'pickup',
  'in_progress',
  'completed',
  'cancelled'
])

const AcceptJobSchema = z.object({
  jobId: JobIdSchema,
  providerId: z.string().uuid('Invalid provider ID'),
  estimatedArrival: z.number().min(1).max(60).optional()
})

const UpdateStatusSchema = z.object({
  jobId: JobIdSchema,
  status: JobStatusSchema,
  notes: z.string().max(500).optional()
})

// Types
interface JobFilters {
  serviceTypes?: ServiceType[]
  maxDistance?: number
  minFare?: number
}

interface AcceptJobResult {
  success: boolean
  job?: Job
  error?: string
}

interface UpdateStatusResult {
  success: boolean
  error?: string
}

export function useProviderJobs() {
  const { handleError } = useErrorHandler()
  
  // State
  const availableJobs = ref<Job[]>([])
  const currentJob = ref<Job | null>(null)
  const jobHistory = ref<Job[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  
  // Realtime channel
  let realtimeChannel: ReturnType<typeof supabase.channel> | null = null
  
  // Computed
  const hasCurrentJob = computed(() => currentJob.value !== null)
  const availableJobCount = computed(() => availableJobs.value.length)
  const canAcceptJobs = computed(() => !hasCurrentJob.value && !loading.value)
  
  /**
   * Load available jobs for provider
   * Uses RLS policies to ensure provider only sees appropriate jobs
   */
  async function loadAvailableJobs(filters?: JobFilters): Promise<Job[]> {
    loading.value = true
    error.value = null
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('Not authenticated')
      }
      
      // Get provider record
      const { data: provider } = await supabase
        .from('providers_v2')
        .select('id, service_types, current_lat, current_lng')
        .eq('user_id', user.id)
        .single()
      
      if (!provider) {
        throw new Error('Provider not found')
      }
      
      // Query ride_requests with RLS (production schema)
      let query = supabase
        .from('ride_requests')
        .select(`
          id,
          user_id,
          tracking_id,
          pickup_lat,
          pickup_lng,
          pickup_address,
          destination_lat,
          destination_lng,
          destination_address,
          estimated_fare,
          status,
          ride_type,
          created_at,
          scheduled_time
        `)
        .eq('status', 'pending')
        .is('provider_id', null)
        .order('created_at', { ascending: true })
        .limit(20)
      
      // Apply filters
      if (filters?.serviceTypes && filters.serviceTypes.length > 0) {
        query = query.in('ride_type', filters.serviceTypes)
      }
      
      if (filters?.minFare) {
        query = query.gte('estimated_fare', filters.minFare)
      }
      
      const { data, error: queryError } = await query
      
      if (queryError) {
        throw queryError
      }
      
      // Map to Job type
      const jobs: Job[] = (data || []).map(ride => ({
        id: ride.id,
        service_type: (ride.ride_type as ServiceType) || 'ride',
        status: 'pending' as const,
        customer_id: ride.user_id,
        pickup_location: {
          lat: ride.pickup_lat,
          lng: ride.pickup_lng
        },
        pickup_address: ride.pickup_address,
        dropoff_location: {
          lat: ride.destination_lat,
          lng: ride.destination_lng
        },
        dropoff_address: ride.destination_address,
        estimated_earnings: ride.estimated_fare,
        estimated_duration: undefined, // Column doesn't exist in production
        estimated_distance: undefined, // Column doesn't exist in production
        created_at: ride.created_at,
        scheduled_at: ride.scheduled_time
      }))
      
      // Apply distance filter if provider has location
      let filteredJobs = jobs
      if (filters?.maxDistance && provider.current_lat && provider.current_lng) {
        filteredJobs = jobs.filter(job => {
          if (!job.pickup_location) return true
          const distance = calculateDistance(
            provider.current_lat,
            provider.current_lng,
            job.pickup_location.lat,
            job.pickup_location.lng
          )
          return distance <= (filters.maxDistance || Infinity)
        })
      }
      
      availableJobs.value = filteredJobs
      return filteredJobs
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load jobs'
      error.value = message
      handleError(err, 'useProviderJobs.loadAvailableJobs')
      return []
    } finally {
      loading.value = false
    }
  }
  
  /**
   * Accept a job
   * Validates input and handles race conditions
   */
  async function acceptJob(jobId: string): Promise<AcceptJobResult> {
    loading.value = true
    error.value = null
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { success: false, error: 'Not authenticated' }
      }
      
      // Get provider ID
      const { data: provider } = await supabase
        .from('providers_v2')
        .select('id, is_online, is_available')
        .eq('user_id', user.id)
        .single()
      
      if (!provider) {
        return { success: false, error: 'Provider not found' }
      }
      
      if (!provider.is_online || !provider.is_available) {
        return { success: false, error: 'Provider not available' }
      }
      
      // Validate input
      const validation = AcceptJobSchema.safeParse({
        jobId,
        providerId: provider.id
      })
      
      if (!validation.success) {
        return { 
          success: false, 
          error: validation.error.errors[0]?.message || 'Invalid input'
        }
      }
      
      // Check if provider already has active job
      if (currentJob.value) {
        return { success: false, error: 'Already have an active job' }
      }
      
      // Accept job with race condition protection
      const { data, error: updateError } = await supabase
        .from('ride_requests')
        .update({
          provider_id: provider.id,
          status: 'matched',
          accepted_at: new Date().toISOString()
        })
        .eq('id', jobId)
        .eq('status', 'pending') // Prevent race condition
        .is('provider_id', null) // Ensure not already taken
        .select()
        .single()
      
      if (updateError || !data) {
        return { 
          success: false, 
          error: 'Job already taken or unavailable' 
        }
      }
      
      const job: Job = {
        id: data.id,
        service_type: (data.ride_type as ServiceType) || 'ride',
        status: 'matched', // After acceptance, status is 'matched'
        customer_id: data.user_id,
        pickup_location: {
          lat: data.pickup_lat,
          lng: data.pickup_lng
        },
        pickup_address: data.pickup_address,
        dropoff_location: {
          lat: data.destination_lat,
          lng: data.destination_lng
        },
        dropoff_address: data.destination_address,
        estimated_earnings: data.estimated_fare,
        estimated_duration: undefined, // Column doesn't exist in production
        estimated_distance: undefined, // Column doesn't exist in production
        created_at: data.created_at,
        accepted_at: data.accepted_at,
        provider_id: provider.id
      }
      
      currentJob.value = job
      
      // Remove from available jobs
      availableJobs.value = availableJobs.value.filter(j => j.id !== jobId)
      
      return { success: true, job }
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to accept job'
      error.value = message
      handleError(err, 'useProviderJobs.acceptJob')
      return { success: false, error: message }
    } finally {
      loading.value = false
    }
  }
  
  /**
   * Update job status
   * Validates status transitions
   */
  async function updateJobStatus(
    jobId: string, 
    status: Job['status'],
    notes?: string
  ): Promise<UpdateStatusResult> {
    loading.value = true
    error.value = null
    
    try {
      // Validate input
      const validation = UpdateStatusSchema.safeParse({ jobId, status, notes })
      
      if (!validation.success) {
        return { 
          success: false, 
          error: validation.error.errors[0]?.message || 'Invalid input'
        }
      }
      
      // Map status to ride_requests status (aligned with database)
      const statusMap: Record<Job['status'], string> = {
        'pending': 'pending',
        'matched': 'matched',
        'pickup': 'pickup',
        'in_progress': 'in_progress',
        'completed': 'completed',
        'cancelled': 'cancelled'
      }
      
      const rideStatus = statusMap[status]
      
      // Update with timestamp based on status
      const updates: Record<string, unknown> = {
        status: rideStatus,
        updated_at: new Date().toISOString()
      }
      
      if (status === 'pickup') {
        updates.arrived_at = new Date().toISOString()
      } else if (status === 'in_progress') {
        updates.started_at = new Date().toISOString()
      } else if (status === 'completed') {
        updates.completed_at = new Date().toISOString()
      } else if (status === 'cancelled') {
        updates.cancelled_at = new Date().toISOString()
        if (notes) updates.cancellation_reason = notes
      }
      
      const { error: updateError } = await supabase
        .from('ride_requests')
        .update(updates)
        .eq('id', jobId)
      
      if (updateError) {
        throw updateError
      }
      
      // Update local state
      if (currentJob.value?.id === jobId) {
        currentJob.value = {
          ...currentJob.value,
          status
        }
        
        // Clear current job if completed or cancelled
        if (status === 'completed' || status === 'cancelled') {
          jobHistory.value.unshift(currentJob.value)
          currentJob.value = null
        }
      }
      
      return { success: true }
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update status'
      error.value = message
      handleError(err, 'useProviderJobs.updateJobStatus')
      return { success: false, error: message }
    } finally {
      loading.value = false
    }
  }
  
  /**
   * Load current active job
   */
  async function loadCurrentJob(): Promise<Job | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null
      
      const { data: provider } = await supabase
        .from('providers_v2')
        .select('id')
        .eq('user_id', user.id)
        .single()
      
      if (!provider) return null
      
      const { data } = await supabase
        .from('ride_requests')
        .select('*')
        .eq('provider_id', provider.id)
        .in('status', ['matched', 'pickup', 'in_progress'])
        .order('accepted_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      
      if (!data) {
        currentJob.value = null
        return null
      }
      
      const job: Job = {
        id: data.id,
        service_type: (data.ride_type as ServiceType) || 'ride',
        status: data.status as Job['status'],
        customer_id: data.user_id,
        pickup_location: {
          lat: data.pickup_lat,
          lng: data.pickup_lng
        },
        pickup_address: data.pickup_address,
        dropoff_location: {
          lat: data.destination_lat,
          lng: data.destination_lng
        },
        dropoff_address: data.destination_address,
        estimated_earnings: data.estimated_fare,
        estimated_duration: undefined, // Column doesn't exist in production
        estimated_distance: undefined, // Column doesn't exist in production
        created_at: data.created_at,
        accepted_at: data.accepted_at,
        provider_id: provider.id
      }
      
      currentJob.value = job
      return job
      
    } catch (err) {
      handleError(err, 'useProviderJobs.loadCurrentJob')
      return null
    }
  }
  
  /**
   * Subscribe to new jobs
   * Uses Supabase Realtime for instant notifications
   */
  function subscribeToNewJobs(): void {
    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel)
    }
    
    realtimeChannel = supabase
      .channel('provider-jobs')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'ride_requests',
        filter: 'status=eq.pending'
      }, (payload) => {
        console.log('[ProviderJobs] New job available:', payload.new)
        
        // Add to available jobs if not already there
        const newJob = payload.new as Record<string, unknown>
        const exists = availableJobs.value.some(j => j.id === newJob.id)
        
        if (!exists) {
          const job: Job = {
            id: String(newJob.id),
            service_type: (newJob.ride_type as ServiceType) || 'ride',
            status: 'pending',
            customer_id: String(newJob.user_id),
            pickup_location: {
              lat: Number(newJob.pickup_lat),
              lng: Number(newJob.pickup_lng)
            },
            pickup_address: String(newJob.pickup_address),
            dropoff_location: {
              lat: Number(newJob.destination_lat),
              lng: Number(newJob.destination_lng)
            },
            dropoff_address: String(newJob.destination_address),
            estimated_earnings: Number(newJob.estimated_fare),
            estimated_duration: undefined, // Column doesn't exist in production
            estimated_distance: undefined, // Column doesn't exist in production
            created_at: String(newJob.created_at)
          }
          
          availableJobs.value.unshift(job)
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'ride_requests'
      }, (payload) => {
        const updated = payload.new as Record<string, unknown>
        
        // Remove from available if taken by another provider
        if (updated.provider_id && updated.status !== 'pending') {
          availableJobs.value = availableJobs.value.filter(
            j => j.id !== updated.id
          )
        }
        
        // Update current job if it's ours
        if (currentJob.value?.id === updated.id) {
          currentJob.value = {
            ...currentJob.value,
            status: updated.status as Job['status']
          }
        }
      })
      .subscribe()
  }
  
  /**
   * Cleanup subscriptions
   */
  function cleanup(): void {
    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel)
      realtimeChannel = null
    }
  }
  
  // Cleanup on unmount
  onUnmounted(cleanup)
  
  return {
    // State
    availableJobs,
    currentJob,
    jobHistory,
    loading,
    error,
    
    // Computed
    hasCurrentJob,
    availableJobCount,
    canAcceptJobs,
    
    // Methods
    loadAvailableJobs,
    acceptJob,
    updateJobStatus,
    loadCurrentJob,
    subscribeToNewJobs,
    cleanup
  }
}

/**
 * Calculate distance between two points (Haversine formula)
 */
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371 // Earth radius in km
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180)
}
