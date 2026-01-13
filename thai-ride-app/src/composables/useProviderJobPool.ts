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

export type ServiceType = 'ride' | 'delivery' | 'shopping'
export type RequestStatus = 'pending' | 'accepted' | 'arrived' | 'in_progress' | 'completed' | 'cancelled'

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

export function useProviderJobPool(serviceTypes: ServiceType[] = ['ride']) {
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
  async function acceptJob(requestId: string, requestType: ServiceType = 'ride'): Promise<AcceptResult> {
    isLoading.value = true
    error.value = null

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        error.value = 'กรุณาเข้าสู่ระบบ'
        return { success: false, error: 'AUTH_REQUIRED' }
      }

      // Get provider ID from providers_v2 table
      const { data: provider } = await supabase
        .from('providers_v2')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!provider) {
        error.value = 'ไม่พบข้อมูลผู้ให้บริการ'
        return { success: false, error: 'PROVIDER_NOT_FOUND' }
      }

      console.log('[Provider] Accepting job:', requestId, 'provider_id:', provider.id)

      // Update ride_requests table directly with race condition protection
      const { data: updatedRide, error: updateError } = await supabase
        .from('ride_requests')
        .update({
          provider_id: provider.id,
          status: 'accepted',
          accepted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId)
        .eq('status', 'pending') // Race condition protection
        .is('provider_id', null) // Ensure not already accepted
        .select()
        .maybeSingle()

      if (updateError) {
        console.error('[Provider] Accept job error:', updateError)
        error.value = 'ไม่สามารถรับงานได้'
        return { success: false, error: updateError.message }
      }

      if (!updatedRide) {
        console.log('[Provider] Job already taken or not found')
        // Remove from available jobs
        availableJobs.value = availableJobs.value.filter(j => j.id !== requestId)
        error.value = 'งานนี้ถูกรับไปแล้ว'
        return { success: false, error: 'ALREADY_ACCEPTED' }
      }

      console.log('[Provider] ✓ Job accepted successfully:', updatedRide)

      // Remove from available jobs
      availableJobs.value = availableJobs.value.filter(j => j.id !== requestId)

      // Set as current job
      currentJob.value = {
        ...updatedRide,
        type: requestType
      } as JobRequest

      // Subscribe to current job updates
      await subscribeToCurrentJob()

      return { success: true, requestId }
    } catch (err: any) {
      console.error('[Provider] Accept job exception:', err)
      error.value = err.message || 'เกิดข้อผิดพลาด'
      return { success: false, error: err.message }
    } finally {
      isLoading.value = false
    }
  }

  // Fetch current job details
  async function fetchCurrentJob(requestId: string, requestType: ServiceType = 'ride'): Promise<void> {
    try {
      const { data, error: fetchError } = await supabase
        .from('ride_requests')
        .select(`
          *,
          customer:user_id (
            id,
            email,
            profiles!inner (
              first_name,
              last_name,
              phone_number
            )
          )
        `)
        .eq('id', requestId)
        .maybeSingle()

      if (fetchError) {
        console.error('[Provider] Fetch current job error:', fetchError)
        throw fetchError
      }
      
      if (!data) {
        console.error('[Provider] Job not found:', requestId)
        return
      }

      // Transform customer data
      const customer = data.customer as any
      const customerInfo: CustomerInfo = {
        id: customer?.id || '',
        first_name: customer?.profiles?.first_name || '',
        last_name: customer?.profiles?.last_name || '',
        phone_number: customer?.profiles?.phone_number || ''
      }

      currentJob.value = { 
        ...data, 
        type: requestType,
        customer: customerInfo
      } as JobRequest
      
      console.log('[Provider] Current job set:', currentJob.value)
      
      // Subscribe to current job updates
      await subscribeToCurrentJob()
    } catch (err) {
      console.error('[Provider] fetchCurrentJob error:', err)
      throw err
    }
  }

  // Update job status
  async function updateJobStatus(status: RequestStatus): Promise<void> {
    if (!currentJob.value) {
      error.value = 'ไม่มีงานปัจจุบัน'
      throw new Error('ไม่มีงานปัจจุบัน')
    }

    isLoading.value = true
    error.value = null

    try {
      const timestampField = `${status}_at`
      const updateData: Record<string, any> = {
        status,
        updated_at: new Date().toISOString()
      }

      // Add timestamp for specific statuses
      if (['accepted', 'arrived', 'in_progress', 'completed'].includes(status)) {
        updateData[timestampField] = new Date().toISOString()
      }

      console.log('[Provider] Updating job status:', status, updateData)

      const { data: updatedJob, error: updateError } = await supabase
        .from('ride_requests')
        .update(updateData)
        .eq('id', currentJob.value.id)
        .select()
        .maybeSingle()

      if (updateError) {
        console.error('[Provider] Update status error:', updateError)
        throw updateError
      }

      if (updatedJob) {
        currentJob.value = { ...updatedJob, type: currentJob.value.type } as JobRequest
        console.log('[Provider] ✓ Status updated:', status)
      }
    } catch (err: any) {
      console.error('[Provider] updateJobStatus error:', err)
      error.value = err.message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Complete job
  async function completeJob(actualFare?: number): Promise<CompleteResult> {
    if (!currentJob.value) {
      error.value = 'ไม่มีงานปัจจุบัน'
      return { success: false }
    }

    isLoading.value = true
    error.value = null

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        error.value = 'กรุณาเข้าสู่ระบบ'
        return { success: false }
      }

      console.log('[Provider] Completing job:', currentJob.value.id, 'actualFare:', actualFare)

      // Update ride to completed status
      const finalFare = actualFare || currentJob.value.estimated_fare
      const { data: completedRide, error: updateError } = await supabase
        .from('ride_requests')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          final_fare: finalFare,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentJob.value.id)
        .select()
        .maybeSingle()

      if (updateError) {
        console.error('[Provider] Complete job error:', updateError)
        throw updateError
      }

      console.log('[Provider] ✓ Job completed successfully')

      // Calculate earnings (simplified - 80% to provider, 20% platform fee)
      const providerEarnings = Math.round(finalFare * 0.8)
      const platformFee = finalFare - providerEarnings

      // Clear current job
      currentJob.value = null
      await unsubscribeFromCurrentJob()

      return {
        success: true,
        finalFare,
        providerEarnings,
        platformFee
      }
    } catch (err: any) {
      console.error('[Provider] Complete job exception:', err)
      error.value = err.message || 'เกิดข้อผิดพลาด'
      return { success: false }
    } finally {
      isLoading.value = false
    }
  }

  // Subscribe to new jobs
  async function subscribeToNewJobs(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Get provider location from providers_v2 table
    const { data: provider } = await supabase
      .from('providers_v2')
      .select('current_lat, current_lng, service_types')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!provider) return

    providerLocation.value = {
      lat: provider.current_lat || 0,
      lng: provider.current_lng || 0
    }

    // Subscribe to ride_requests table directly (main table used by customers)
    const channel = supabase
      .channel(`new_ride_jobs_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ride_requests',
          filter: 'status=eq.pending'
        },
        async (payload) => {
          const newJob = payload.new as any
          console.log('[Provider] New ride request:', newJob)

          // Calculate distance if provider has location
          if (providerLocation.value && newJob.pickup_lat && newJob.pickup_lng) {
            const distance = calculateDistance(
              providerLocation.value.lat,
              providerLocation.value.lng,
              newJob.pickup_lat,
              newJob.pickup_lng
            )

            // Only show jobs within 10km radius
            if (distance > 10) {
              console.log('[Provider] Job too far:', distance, 'km')
              return
            }

            newJob.distance = distance
          }

          // Transform to JobRequest format
          const jobRequest: JobRequest = {
            id: newJob.id,
            tracking_id: newJob.tracking_id || newJob.id,
            user_id: newJob.user_id,
            status: newJob.status,
            estimated_fare: newJob.estimated_fare || 0,
            pickup_lat: newJob.pickup_lat,
            pickup_lng: newJob.pickup_lng,
            pickup_address: newJob.pickup_address,
            destination_lat: newJob.destination_lat,
            destination_lng: newJob.destination_lng,
            destination_address: newJob.destination_address,
            created_at: newJob.created_at,
            type: 'ride',
            distance: newJob.distance
          }

          // Add to available jobs
          availableJobs.value.push(jobRequest)
          
          // Play notification sound
          playNotificationSound()
          
          console.log('[Provider] Job added to available list:', jobRequest.id)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'ride_requests'
        },
        (payload) => {
          const updated = payload.new as any
          // Remove from available if no longer pending
          if (updated.status !== 'pending') {
            availableJobs.value = availableJobs.value.filter(j => j.id !== updated.id)
            console.log('[Provider] Job removed from available list:', updated.id, 'status:', updated.status)
          }
        }
      )
      .subscribe((status) => {
        console.log('[Provider] Realtime subscription status:', status)
      })

    realtimeChannels.value.push(channel)
  }

  // Subscribe to current job updates
  async function subscribeToCurrentJob(): Promise<void> {
    if (!currentJob.value) return

    console.log('[Provider] Subscribing to current job updates:', currentJob.value.id)
    
    const channel = supabase
      .channel(`provider_job:${currentJob.value.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'ride_requests',
          filter: `id=eq.${currentJob.value.id}`
        },
        (payload) => {
          console.log('[Provider] Job update received:', payload.new)
          if (currentJob.value) {
            currentJob.value = { 
              ...payload.new, 
              type: currentJob.value.type,
              customer: currentJob.value.customer 
            } as JobRequest
          }
        }
      )
      .subscribe((status) => {
        console.log('[Provider] Current job subscription status:', status)
      })

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

      console.log('[Provider] Loading available jobs...')

      // Get provider location from providers_v2 table
      const { data: provider } = await supabase
        .from('providers_v2')
        .select('current_lat, current_lng')
        .eq('user_id', user.id)
        .maybeSingle()

      if (provider && provider.current_lat && provider.current_lng) {
        providerLocation.value = { 
          lat: provider.current_lat, 
          lng: provider.current_lng 
        }
        console.log('[Provider] Provider location:', providerLocation.value)
      }

      // Load pending ride requests
      const { data: rides, error: ridesError } = await supabase
        .from('ride_requests')
        .select('*')
        .eq('status', 'pending')
        .is('provider_id', null)
        .order('created_at', { ascending: false })
        .limit(20)

      if (ridesError) {
        console.error('[Provider] Load jobs error:', ridesError)
        throw ridesError
      }

      const jobs: JobRequest[] = []

      if (rides) {
        for (const ride of rides) {
          const jobWithType: JobRequest = { 
            ...ride, 
            type: 'ride',
            tracking_id: ride.tracking_id || ride.id
          }
          
          // Calculate distance if provider has location
          if (providerLocation.value && ride.pickup_lat && ride.pickup_lng) {
            jobWithType.distance = calculateDistance(
              providerLocation.value.lat,
              providerLocation.value.lng,
              ride.pickup_lat,
              ride.pickup_lng
            )
            
            // Only include jobs within 10km radius
            if (jobWithType.distance <= 10) {
              jobs.push(jobWithType)
            }
          } else {
            jobs.push(jobWithType)
          }
        }
      }

      availableJobs.value = jobs
      console.log('[Provider] ✓ Loaded', jobs.length, 'available jobs')
    } catch (err) {
      console.error('[Provider] loadAvailableJobs error:', err)
      error.value = 'ไม่สามารถโหลดงานได้'
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
