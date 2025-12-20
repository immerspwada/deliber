/**
 * useProviderJobPool - Provider Job Pool Composable
 * Task: 8 - Implement useProviderJobPool composable
 * Requirements: 4.2, 6.1, 6.2, 6.5
 * 
 * Handles provider operations:
 * - Subscribing to new jobs with location filtering
 * - Accepting jobs with race-safe logic
 * - Updating job status
 * - Completing jobs with fare adjustment
 */

import { ref, computed, onUnmounted } from 'vue'
import { supabase } from '@/lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { 
  type ServiceType, 
  type RequestStatus,
  getServiceDefinition,
  getAtomicFunction,
  getTableName,
  getAllServiceTypes
} from '@/lib/serviceRegistry'
import { AppError, handleRpcError, ErrorType } from '@/lib/errorHandler'

export interface JobRequest {
  id: string
  tracking_id: string
  user_id: string
  status: RequestStatus
  estimated_fare: number
  pickup_lat: number | null
  pickup_lng: number | null
  pickup_address: string | null
  destination_lat: number | null
  destination_lng: number | null
  destination_address: string | null
  created_at: string
  type: ServiceType
  distance?: number
  customer?: CustomerInfo
  [key: string]: any
}

export interface CustomerInfo {
  id: string
  first_name: string
  last_name: string
  phone_number: string
}

export interface AcceptResult {
  success: boolean
  requestId?: string
  error?: string
}

export interface CompleteResult {
  success: boolean
  finalFare?: number
  providerEarnings?: number
  platformFee?: number
}

export function useProviderJobPool(serviceTypes: ServiceType[] = getAllServiceTypes()) {
  const availableJobs = ref<JobRequest[]>([])
  const currentJob = ref<JobRequest | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const realtimeChannels = ref<RealtimeChannel[]>([])
  const providerLocation = ref<{ lat: number; lng: number } | null>(null)

  // Computed
  const hasCurrentJob = computed(() => currentJob.value !== null)
  const jobCount = computed(() => availableJobs.value.length)
  const sortedJobs = computed(() => 
    [...availableJobs.value].sort((a, b) => (a.distance || 999) - (b.distance || 999))
  )

  // Calculate distance between two points (Haversine formula)
  function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371 // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  // Accept job
  async function acceptJob(requestId: string, requestType: ServiceType): Promise<AcceptResult> {
    isLoading.value = true
    error.value = null

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new AppError(ErrorType.AUTH_REQUIRED)

      const functionName = getAtomicFunction(requestType, 'accept')
      const paramName = `p_${requestType}_id`
      
      const { data, error: rpcError } = await supabase.rpc(functionName, {
        [paramName]: requestId,
        p_provider_id: user.id
      })

      if (rpcError) {
        const appError = handleRpcError(rpcError)
        if (appError.type === ErrorType.ALREADY_ACCEPTED) {
          // Remove from available jobs
          availableJobs.value = availableJobs.value.filter(j => j.id !== requestId)
          return { success: false, error: 'ALREADY_ACCEPTED' }
        }
        throw appError
      }

      // Remove from available jobs
      availableJobs.value = availableJobs.value.filter(j => j.id !== requestId)

      // Fetch and set as current job
      await fetchCurrentJob(requestId, requestType)

      return { success: true, requestId }
    } catch (err: any) {
      error.value = err.message
      return { success: false, error: err.message }
    } finally {
      isLoading.value = false
    }
  }

  // Fetch current job details
  async function fetchCurrentJob(requestId: string, requestType: ServiceType): Promise<void> {
    const tableName = getTableName(requestType)
    
    const { data, error: fetchError } = await supabase
      .from(tableName)
      .select(`
        *,
        customer:users!user_id(id, first_name, last_name, phone_number)
      `)
      .eq('id', requestId)
      .single()

    if (fetchError) throw fetchError
    
    currentJob.value = { ...data, type: requestType } as JobRequest
    
    // Subscribe to current job updates
    await subscribeToCurrentJob()
  }

  // Update job status
  async function updateJobStatus(status: RequestStatus): Promise<void> {
    if (!currentJob.value) throw new AppError(ErrorType.REQUEST_NOT_FOUND, 'ไม่มีงานปัจจุบัน')

    isLoading.value = true
    error.value = null

    try {
      const tableName = getTableName(currentJob.value.type)
      const timestampField = `${status}_at`

      const { error: updateError } = await supabase
        .from(tableName)
        .update({
          status,
          [timestampField]: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', currentJob.value.id)

      if (updateError) throw updateError

      currentJob.value.status = status
    } catch (err: any) {
      error.value = err.message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Complete job
  async function completeJob(actualFare?: number): Promise<CompleteResult> {
    if (!currentJob.value) throw new AppError(ErrorType.REQUEST_NOT_FOUND, 'ไม่มีงานปัจจุบัน')

    isLoading.value = true
    error.value = null

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new AppError(ErrorType.AUTH_REQUIRED)

      const functionName = getAtomicFunction(currentJob.value.type, 'complete')
      const paramName = `p_${currentJob.value.type}_id`

      const { data, error: rpcError } = await supabase.rpc(functionName, {
        [paramName]: currentJob.value.id,
        p_provider_id: user.id,
        p_actual_fare: actualFare || null
      })

      if (rpcError) throw handleRpcError(rpcError)

      // Clear current job
      currentJob.value = null
      await unsubscribeFromCurrentJob()

      return {
        success: true,
        finalFare: data.final_fare,
        providerEarnings: data.provider_earnings,
        platformFee: data.platform_fee
      }
    } catch (err: any) {
      error.value = err.message
      return { success: false }
    } finally {
      isLoading.value = false
    }
  }

  // Subscribe to new jobs
  async function subscribeToNewJobs(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Get provider location - use maybeSingle() to avoid 406 error
    const { data: provider } = await supabase
      .from('service_providers')
      .select('current_lat, current_lng, enabled_services')
      .eq('id', user.id)
      .maybeSingle()

    if (!provider) return

    providerLocation.value = {
      lat: provider.current_lat,
      lng: provider.current_lng
    }

    // Subscribe to each service type
    for (const serviceType of serviceTypes) {
      const tableName = getTableName(serviceType)
      
      const channel = supabase
        .channel(`new_${serviceType}_jobs_${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: tableName,
            filter: 'status=eq.pending'
          },
          async (payload) => {
            const newJob = payload.new as JobRequest
            newJob.type = serviceType

            // Calculate distance if provider has location
            if (providerLocation.value && newJob.pickup_lat && newJob.pickup_lng) {
              newJob.distance = calculateDistance(
                providerLocation.value.lat,
                providerLocation.value.lng,
                newJob.pickup_lat,
                newJob.pickup_lng
              )

              // Only show jobs within 5km radius
              if (newJob.distance > 5) return
            }

            // Add to available jobs
            availableJobs.value.push(newJob)
            
            // Play notification sound
            playNotificationSound()
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: tableName
          },
          (payload) => {
            const updated = payload.new as JobRequest
            // Remove from available if no longer pending
            if (updated.status !== 'pending') {
              availableJobs.value = availableJobs.value.filter(j => j.id !== updated.id)
            }
          }
        )
        .subscribe()

      realtimeChannels.value.push(channel)
    }
  }

  // Subscribe to current job updates
  async function subscribeToCurrentJob(): Promise<void> {
    if (!currentJob.value) return

    const tableName = getTableName(currentJob.value.type)
    
    const channel = supabase
      .channel(`provider_job:${currentJob.value.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: tableName,
          filter: `id=eq.${currentJob.value.id}`
        },
        (payload) => {
          if (currentJob.value) {
            currentJob.value = { ...payload.new, type: currentJob.value.type } as JobRequest
          }
        }
      )
      .subscribe()

    realtimeChannels.value.push(channel)
  }

  // Unsubscribe from current job
  async function unsubscribeFromCurrentJob(): Promise<void> {
    const jobChannel = realtimeChannels.value.find(c => 
      c.topic.startsWith('provider_job:')
    )
    if (jobChannel) {
      await supabase.removeChannel(jobChannel)
      realtimeChannels.value = realtimeChannels.value.filter(c => c !== jobChannel)
    }
  }

  // Play notification sound
  function playNotificationSound(): void {
    try {
      const audio = new Audio('/sounds/new-job.mp3')
      audio.play().catch(() => {})
    } catch {}
  }

  // Load initial available jobs
  async function loadAvailableJobs(): Promise<void> {
    isLoading.value = true
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Use maybeSingle() to avoid 406 error
      const { data: provider } = await supabase
        .from('service_providers')
        .select('current_lat, current_lng')
        .eq('id', user.id)
        .maybeSingle()

      if (provider) {
        providerLocation.value = { lat: provider.current_lat, lng: provider.current_lng }
      }

      const jobs: JobRequest[] = []

      for (const serviceType of serviceTypes) {
        const tableName = getTableName(serviceType)
        
        const { data } = await supabase
          .from(tableName)
          .select('*')
          .eq('status', 'pending')
          .is('provider_id', null)
          .order('created_at', { ascending: false })
          .limit(20)

        if (data) {
          for (const job of data) {
            const jobWithType = { ...job, type: serviceType } as JobRequest
            
            if (providerLocation.value && job.pickup_lat && job.pickup_lng) {
              jobWithType.distance = calculateDistance(
                providerLocation.value.lat,
                providerLocation.value.lng,
                job.pickup_lat,
                job.pickup_lng
              )
              if (jobWithType.distance <= 5) {
                jobs.push(jobWithType)
              }
            } else {
              jobs.push(jobWithType)
            }
          }
        }
      }

      availableJobs.value = jobs
    } finally {
      isLoading.value = false
    }
  }

  // Cleanup
  async function cleanup(): Promise<void> {
    for (const channel of realtimeChannels.value) {
      await supabase.removeChannel(channel)
    }
    realtimeChannels.value = []
  }

  onUnmounted(() => cleanup())

  return {
    availableJobs,
    currentJob,
    isLoading,
    error,
    hasCurrentJob,
    jobCount,
    sortedJobs,
    acceptJob,
    updateJobStatus,
    completeJob,
    subscribeToNewJobs,
    loadAvailableJobs,
    cleanup
  }
}
