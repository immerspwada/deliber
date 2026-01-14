/**
 * useSimpleProviderJobPool - Simple Provider Job Pool
 * ลบเงื่อนไขซับซ้อนออกไปก่อน เพื่อให้ Provider เห็นงานจาก Customer ได้
 */

import { ref, computed, onUnmounted } from 'vue'
import { supabase } from '@/lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

export type ServiceType = 'ride' | 'delivery' | 'shopping'
export type RequestStatus = 'pending' | 'accepted' | 'arrived' | 'in_progress' | 'completed' | 'cancelled'

export interface SimpleJobRequest {
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
  [key: string]: any
}

export interface AcceptResult {
  success: boolean
  requestId?: string
  error?: string
}

export function useSimpleProviderJobPool() {
  const availableJobs = ref<SimpleJobRequest[]>([])
  const currentJob = ref<SimpleJobRequest | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const realtimeChannels = ref<RealtimeChannel[]>([])

  // Computed
  const hasCurrentJob = computed(() => currentJob.value !== null)
  const jobCount = computed(() => availableJobs.value.length)
  const sortedJobs = computed(() => 
    [...availableJobs.value].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  )

  // Accept job - SIMPLIFIED VERSION
  async function acceptJob(requestId: string): Promise<AcceptResult> {
    isLoading.value = true
    error.value = null

    try {
      console.log('[SimpleJobPool] Accepting job:', requestId)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        error.value = 'กรุณาเข้าสู่ระบบ'
        return { success: false, error: 'AUTH_REQUIRED' }
      }

      // Get provider ID - SIMPLIFIED: just use user_id if no provider profile
      let providerId = user.id
      
      const { data: provider } = await supabase
        .from('providers_v2')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (provider) {
        providerId = provider.id
      }

      console.log('[SimpleJobPool] Using provider_id:', providerId)

      // Update ride_requests - SIMPLIFIED: no race condition checks
      const { data: updatedRide, error: updateError } = await supabase
        .from('ride_requests')
        .update({
          provider_id: providerId,
          status: 'matched',
          accepted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId)
        .select()
        .maybeSingle()

      if (updateError) {
        console.error('[SimpleJobPool] Accept job error:', updateError)
        error.value = 'ไม่สามารถรับงานได้: ' + updateError.message
        return { success: false, error: updateError.message }
      }

      if (!updatedRide) {
        console.log('[SimpleJobPool] Job not found or already taken')
        availableJobs.value = availableJobs.value.filter(j => j.id !== requestId)
        error.value = 'ไม่พบงานนี้หรือถูกรับไปแล้ว'
        return { success: false, error: 'JOB_NOT_FOUND' }
      }

      console.log('[SimpleJobPool] ✓ Job accepted successfully:', updatedRide)

      // Remove from available jobs
      availableJobs.value = availableJobs.value.filter(j => j.id !== requestId)

      // Set as current job
      currentJob.value = {
        ...updatedRide,
        type: 'ride'
      } as SimpleJobRequest

      return { success: true, requestId }

    } catch (err: any) {
      console.error('[SimpleJobPool] Accept job exception:', err)
      error.value = err.message || 'เกิดข้อผิดพลาด'
      return { success: false, error: err.message }
    } finally {
      isLoading.value = false
    }
  }

  // Load available jobs - SIMPLIFIED VERSION
  async function loadAvailableJobs(): Promise<void> {
    isLoading.value = true
    error.value = null
    
    try {
      console.log('[SimpleJobPool] Loading available jobs...')

      // SIMPLIFIED: Load ALL pending rides without any filters
      const { data: rides, error: ridesError } = await supabase
        .from('ride_requests')
        .select(`
          id,
          tracking_id,
          user_id,
          status,
          pickup_lat,
          pickup_lng,
          pickup_address,
          destination_lat,
          destination_lng,
          destination_address,
          estimated_fare,
          created_at
        `)
        .eq('status', 'pending')
        .is('provider_id', null)
        .order('created_at', { ascending: false })
        .limit(50) // Increased limit

      if (ridesError) {
        console.error('[SimpleJobPool] Load jobs error:', ridesError)
        error.value = `ไม่สามารถโหลดงานได้: ${ridesError.message}`
        return
      }

      console.log('[SimpleJobPool] Raw rides data:', rides?.length || 0, 'rides found')

      const jobs: SimpleJobRequest[] = []

      if (rides && rides.length > 0) {
        for (const ride of rides) {
          const jobWithType: SimpleJobRequest = { 
            ...ride, 
            type: 'ride',
            tracking_id: ride.tracking_id || ride.id
          }
          
          jobs.push(jobWithType)
        }
      }

      availableJobs.value = jobs
      console.log('[SimpleJobPool] ✅ Loaded', jobs.length, 'available jobs')
      
      // Log job details for debugging
      jobs.forEach(job => {
        console.log(`[SimpleJobPool] 📍 ${job.tracking_id}: ${job.pickup_address} → ${job.destination_address} (฿${job.estimated_fare})`)
      })

    } catch (err: any) {
      console.error('[SimpleJobPool] loadAvailableJobs exception:', err)
      error.value = err.message || 'เกิดข้อผิดพลาดในการโหลดงาน'
    } finally {
      isLoading.value = false
    }
  }

  // Subscribe to new jobs - SIMPLIFIED VERSION
  async function subscribeToNewJobs(): Promise<void> {
    try {
      console.log('[SimpleJobPool] 📡 Subscribing to new jobs...')

      const channel = supabase
        .channel('simple_provider_jobs')
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
            console.log('[SimpleJobPool] 🆕 New ride request detected:', newJob.tracking_id || newJob.id)

            // SIMPLIFIED: Add ALL new pending jobs without filters
            if (newJob.provider_id) {
              console.log('[SimpleJobPool] Job already assigned, skipping')
              return
            }

            const jobRequest: SimpleJobRequest = {
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
              type: 'ride'
            }

            // Add to available jobs (avoid duplicates)
            const exists = availableJobs.value.find(j => j.id === jobRequest.id)
            if (!exists) {
              availableJobs.value.unshift(jobRequest) // Add to beginning
              console.log('[SimpleJobPool] ✅ Job added to available list:', jobRequest.tracking_id)
              
              // Play notification sound
              playNotificationSound()
            }
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
            
            // Remove from available if no longer pending or assigned to someone
            if (updated.status !== 'pending' || updated.provider_id) {
              const removed = availableJobs.value.find(j => j.id === updated.id)
              if (removed) {
                availableJobs.value = availableJobs.value.filter(j => j.id !== updated.id)
                console.log('[SimpleJobPool] 🗑️ Job removed from available list:', updated.tracking_id || updated.id, 
                           'status:', updated.status, 'provider:', updated.provider_id ? 'assigned' : 'none')
              }
            }
          }
        )
        .subscribe((status) => {
          console.log('[SimpleJobPool] 📡 Realtime subscription status:', status)
          if (status === 'SUBSCRIBED') {
            console.log('[SimpleJobPool] ✅ Successfully subscribed to job updates')
          }
        })

      realtimeChannels.value.push(channel)

    } catch (error) {
      console.error('[SimpleJobPool] Subscribe to new jobs failed:', error)
    }
  }

  // Play notification sound
  function playNotificationSound(): void {
    try {
      const audio = new Audio('/sounds/new-job.mp3')
      audio.play().catch(() => {})
    } catch {}
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
    // State
    availableJobs,
    currentJob,
    isLoading,
    error,
    
    // Computed
    hasCurrentJob,
    jobCount,
    sortedJobs,
    
    // Methods
    acceptJob,
    loadAvailableJobs,
    subscribeToNewJobs,
    cleanup
  }
}