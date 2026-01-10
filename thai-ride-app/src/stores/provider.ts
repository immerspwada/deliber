import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import { withErrorHandling, createAppError, ErrorCode } from '../utils/errorHandler'

interface Provider {
  id: string
  user_id: string
  provider_uid: string | null
  first_name: string
  last_name: string
  email: string
  phone_number: string
  service_types: string[]
  status: 'pending' | 'pending_verification' | 'approved' | 'active' | 'suspended' | 'rejected'
  is_online: boolean
  rating: number
  total_trips: number
  total_earnings: number
  created_at: string
  updated_at: string
}

interface Job {
  id: string
  service_type: string
  status: string
  pickup_location: any
  pickup_address: string
  dropoff_location?: any
  dropoff_address?: string
  estimated_earnings: number
  distance_km?: number
  duration_minutes?: number
  created_at: string
  customer_id: string
}

interface PerformanceMetrics {
  rating: number
  acceptanceRate: number
  completionRate: number
  cancellationRate: number
}

export const useProviderStore = defineStore('provider', () => {
  // State
  const profile = ref<Provider | null>(null)
  const isOnline = ref(false)
  const currentJob = ref<Job | null>(null)
  const availableJobs = ref<Job[]>([])
  const todayEarnings = ref(0)
  const todayTrips = ref(0)
  const metrics = ref<PerformanceMetrics>({
    rating: 0,
    acceptanceRate: 0,
    completionRate: 0,
    cancellationRate: 0,
  })
  const loading = ref(false)
  const activeServiceType = ref<string | null>(null)
  const error = ref<string | null>(null)

  // Getters
  const canAcceptJobs = computed(() => {
    return (
      profile.value?.status === 'approved' ||
      profile.value?.status === 'active'
    ) && isOnline.value && !currentJob.value
  })

  const serviceTypes = computed(() => profile.value?.service_types || [])

  const isApproved = computed(() => 
    profile.value?.status === 'approved' || profile.value?.status === 'active'
  )

  // Actions
  async function loadProfile(): Promise<void> {
    const { data, error: err } = await withErrorHandling(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw createAppError(ErrorCode.AUTH_ERROR, 'Not authenticated')

      const { data, error } = await supabase
        .from('providers_v2')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (error) throw error

      return data
    }, 'loadProfile')

    if (err) {
      error.value = err.userMessage
      throw err
    }

    if (data) {
      profile.value = data as Provider
      isOnline.value = data.is_online || false
      
      // Load additional data if approved
      if (isApproved.value) {
        await Promise.all([
          loadTodayMetrics(),
          loadCurrentJob()
        ])
      }
    }
  }

  async function toggleOnlineStatus(): Promise<void> {
    if (!profile.value) return

    const newStatus = !isOnline.value
    loading.value = true

    try {
      const { error: updateError } = await supabase
        .from('providers_v2')
        .update({ is_online: newStatus } as any)
        .eq('id', profile.value.id)

      if (updateError) throw updateError

      isOnline.value = newStatus
      profile.value.is_online = newStatus

      // Load available jobs if going online
      if (newStatus && canAcceptJobs.value) {
        await loadAvailableJobs()
      } else {
        availableJobs.value = []
      }
    } catch (err: any) {
      console.error('Error toggling online status:', err)
      error.value = 'ไม่สามารถเปลี่ยนสถานะได้ กรุณาลองใหม่'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function loadAvailableJobs(): Promise<void> {
    if (!profile.value || !isOnline.value || !canAcceptJobs.value) {
      availableJobs.value = []
      return
    }

    try {
      // For now, load mock jobs from database
      // In production, this would call the job-matching Edge Function
      const { data, error } = await supabase
        .from('jobs_v2')
        .select(`
          id,
          service_type,
          status,
          pickup_address,
          dropoff_address,
          estimated_earnings,
          created_at,
          distance_km,
          duration_minutes,
          customer_id
        `)
        .eq('status', 'pending')
        .is('provider_id', null)
        .limit(10)

      if (error) throw error

      // Filter by service types
      const filteredJobs = (data || []).filter(job => 
        profile.value?.service_types.includes(job.service_type || 'ride')
      )

      availableJobs.value = filteredJobs.map(job => ({
        ...job,
        pickup_location: null,
        dropoff_location: null,
        distance_km: job.distance_km || Math.random() * 10 + 1, // Use actual or mock distance
        duration_minutes: job.duration_minutes || Math.floor(Math.random() * 30 + 10), // Use actual or mock duration
      })) as Job[]

    } catch (err: any) {
      console.error('Error loading available jobs:', err)
      availableJobs.value = []
    }
  }

  async function acceptJob(jobId: string): Promise<boolean> {
    if (!profile.value || !canAcceptJobs.value) {
      throw createAppError(ErrorCode.PERMISSION_DENIED, 'ไม่สามารถรับงานได้ กรุณาตรวจสอบสถานะ')
    }

    loading.value = true
    console.log(`[Provider] Attempting to accept job: ${jobId}`)

    try {
      // First, check if job is still available
      const { data: jobCheck, error: checkError } = await supabase
        .from('jobs_v2')
        .select('id, status, provider_id, pickup_address, dropoff_address, estimated_earnings')
        .eq('id', jobId)
        .single()

      if (checkError) {
        console.error('[Provider] Job check error:', checkError)
        throw createAppError(ErrorCode.NOT_FOUND, 'ไม่พบงานที่ต้องการ')
      }

      if (!jobCheck) {
        throw createAppError(ErrorCode.NOT_FOUND, 'ไม่พบงานที่ต้องการ')
      }

      if (jobCheck.status !== 'pending' || jobCheck.provider_id !== null) {
        console.log(`[Provider] Job no longer available: status=${jobCheck.status}, provider_id=${jobCheck.provider_id}`)
        throw createAppError(ErrorCode.NOT_FOUND, 'งานนี้ถูกรับไปแล้ว')
      }

      console.log(`[Provider] Job is available, attempting to accept...`)

      // Use atomic update with proper conditions
      const { data, error } = await supabase
        .from('jobs_v2')
        .update({ 
          provider_id: profile.value.id,
          status: 'accepted',
          accepted_at: new Date().toISOString()
        })
        .eq('id', jobId)
        .eq('status', 'pending') // Atomic condition
        .is('provider_id', null) // Atomic condition
        .select('*')
        .single()

      if (error) {
        console.error('[Provider] Accept job error:', error)
        if (error.code === 'PGRST116') {
          throw createAppError(ErrorCode.NOT_FOUND, 'งานนี้ถูกรับไปแล้ว')
        }
        throw createAppError(ErrorCode.UNKNOWN, `เกิดข้อผิดพลาด: ${error.message}`)
      }

      if (!data) {
        console.log('[Provider] No data returned - job likely taken by another provider')
        throw createAppError(ErrorCode.NOT_FOUND, 'งานนี้ถูกรับไปแล้ว')
      }

      console.log(`[Provider] Job accepted successfully:`, data)

      // Set as current job
      currentJob.value = {
        id: data.id,
        service_type: data.service_type || 'ride',
        status: 'accepted',
        pickup_location: null,
        pickup_address: data.pickup_address,
        dropoff_location: null,
        dropoff_address: data.dropoff_address,
        estimated_earnings: data.estimated_earnings || 0,
        distance_km: data.distance_km,
        duration_minutes: data.duration_minutes,
        created_at: data.created_at,
        customer_id: data.customer_id
      }

      // Remove from available jobs
      availableJobs.value = availableJobs.value.filter(job => job.id !== jobId)

      // Show success message
      console.log(`[Provider] Job accepted: ${data.pickup_address} → ${data.dropoff_address}`)

      return true
    } catch (err: any) {
      console.error('[Provider] Error accepting job:', err)
      
      // Re-throw AppError as-is
      if (err.code && err.userMessage) {
        throw err
      }
      
      // Handle other errors
      if (err.message?.includes('no rows returned')) {
        throw createAppError(ErrorCode.NOT_FOUND, 'งานนี้ถูกรับไปแล้ว')
      }
      
      throw createAppError(ErrorCode.UNKNOWN, 'ไม่สามารถรับงานได้ กรุณาลองใหม่')
    } finally {
      loading.value = false
    }
  }

  async function updateLocation(lat: number, lng: number): Promise<void> {
    if (!currentJob.value || !profile.value) return

    try {
      // Update provider location
      await supabase
        .from('providers_v2')
        .update({ 
          current_location: `POINT(${lng} ${lat})`,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.value.id)

    } catch (error) {
      console.error('Error updating location:', error)
    }
  }

  async function loadTodayMetrics(): Promise<void> {
    if (!profile.value) return

    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      // Get today's completed jobs from earnings table
      const { data: earnings, error: earningsError } = await supabase
        .from('earnings_v2')
        .select('net_earnings, earned_at')
        .eq('provider_id', profile.value.id)
        .gte('earned_at', today.toISOString())
        .lt('earned_at', tomorrow.toISOString())

      if (earningsError) throw earningsError

      todayTrips.value = earnings?.length || 0
      todayEarnings.value = earnings?.reduce((sum, earning) => 
        sum + (earning.net_earnings || 0), 0
      ) || 0

      // Load performance metrics
      await loadPerformanceMetrics()
    } catch (error) {
      console.error('Error loading today metrics:', error)
    }
  }

  async function loadPerformanceMetrics(): Promise<void> {
    if (!profile.value) return

    try {
      // Calculate metrics from job data
      const { data: allJobs, error } = await supabase
        .from('jobs_v2')
        .select('status')
        .eq('provider_id', profile.value.id)

      if (error) throw error

      if (allJobs && allJobs.length > 0) {
        const completed = allJobs.filter(j => j.status === 'completed').length
        const cancelled = allJobs.filter(j => j.status === 'cancelled').length
        const total = allJobs.length

        // Get ratings from a separate query (assuming ratings are stored elsewhere)
        // For now, use the provider's overall rating
        const currentRating = profile.value?.rating || 0

        metrics.value = {
          rating: currentRating,
          acceptanceRate: total > 0 ? (completed / total) * 100 : 0,
          completionRate: total > 0 ? (completed / total) * 100 : 0,
          cancellationRate: total > 0 ? (cancelled / total) * 100 : 0,
        }
      }
    } catch (error) {
      console.error('Error loading performance metrics:', error)
    }
  }

  async function loadCurrentJob(): Promise<void> {
    if (!profile.value) return

    try {
      const { data, error } = await supabase
        .from('jobs_v2')
        .select('*')
        .eq('provider_id', profile.value.id)
        .in('status', ['accepted', 'arrived', 'in_progress'])
        .maybeSingle()

      if (error) throw error

      if (data) {
        currentJob.value = {
          id: data.id,
          service_type: data.service_type || 'ride',
          status: data.status,
          pickup_location: null,
          pickup_address: data.pickup_address,
          dropoff_location: null,
          dropoff_address: data.dropoff_address,
          estimated_earnings: data.estimated_earnings || 0,
          created_at: data.created_at,
          customer_id: data.customer_id
        }
      } else {
        currentJob.value = null
      }
    } catch (error) {
      console.error('Error loading current job:', error)
      currentJob.value = null
    }
  }

  async function completeJob(jobId: string): Promise<void> {
    if (!currentJob.value || currentJob.value.id !== jobId) {
      throw createAppError(ErrorCode.INVALID_INPUT, 'Invalid job')
    }

    loading.value = true

    try {
      const { error } = await supabase
        .from('jobs_v2')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', jobId)

      if (error) throw error

      // Clear current job
      currentJob.value = null

      // Reload metrics
      await loadTodayMetrics()

      // Load new available jobs if still online
      if (isOnline.value) {
        await loadAvailableJobs()
      }
    } catch (err: unknown) {
      console.error('Error completing job:', err)
      throw createAppError(ErrorCode.UNKNOWN, 'Failed to complete job')
    } finally {
      loading.value = false
    }
  }

  function $reset(): void {
    profile.value = null
    isOnline.value = false
    currentJob.value = null
    availableJobs.value = []
    todayEarnings.value = 0
    todayTrips.value = 0
    metrics.value = {
      rating: 0,
      acceptanceRate: 0,
      completionRate: 0,
      cancellationRate: 0,
    }
    loading.value = false
    activeServiceType.value = null
    error.value = null
  }

  return {
    // State
    profile,
    isOnline,
    currentJob,
    availableJobs,
    todayEarnings,
    todayTrips,
    metrics,
    loading,
    activeServiceType,
    error,

    // Getters
    canAcceptJobs,
    serviceTypes,
    isApproved,

    // Actions
    loadProfile,
    toggleOnlineStatus,
    loadAvailableJobs,
    acceptJob,
    updateLocation,
    loadTodayMetrics,
    loadPerformanceMetrics,
    loadCurrentJob,
    completeJob,
    $reset,
  }
})
