import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'

interface Provider {
  id: string
  provider_uid: string | null
  first_name: string
  last_name: string
  email: string
  phone_number: string
  service_types: string[]
  status: string
  is_online: boolean
  rating: number
  total_trips: number
  total_earnings: number
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

  // Getters
  const canAcceptJobs = computed(() => {
    return (
      profile.value?.status === 'approved' ||
      profile.value?.status === 'active'
    ) && isOnline.value && !currentJob.value
  })

  const serviceTypes = computed(() => profile.value?.service_types || [])

  // Actions
  async function loadProfile(): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('providers')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error) throw error

      profile.value = data
      isOnline.value = data.is_online
    } catch (error) {
      console.error('Error loading profile:', error)
      throw error
    }
  }

  async function toggleOnlineStatus(): Promise<void> {
    if (!profile.value) return

    const newStatus = !isOnline.value

    try {
      const { error } = await supabase
        .from('providers')
        .update({ is_online: newStatus })
        .eq('id', profile.value.id)

      if (error) throw error

      isOnline.value = newStatus

      // Load available jobs if going online
      if (newStatus) {
        await loadAvailableJobs()
      } else {
        availableJobs.value = []
      }
    } catch (error) {
      console.error('Error toggling online status:', error)
      throw error
    }
  }

  async function loadAvailableJobs(): Promise<void> {
    if (!profile.value || !isOnline.value) return

    try {
      // Get current location (in real app, use geolocation API)
      // For now, use a default location
      const location = { lat: 13.7563, lng: 100.5018 }

      // Call job matching Edge Function
      const { data, error } = await supabase.functions.invoke('job-matching', {
        body: {
          provider_id: profile.value.id,
          location,
          service_types: profile.value.service_types,
          max_distance_km: 10,
        },
      })

      if (error) throw error

      availableJobs.value = data.jobs || []
    } catch (error) {
      console.error('Error loading available jobs:', error)
      throw error
    }
  }

  async function acceptJob(jobId: string): Promise<void> {
    if (!profile.value) return

    try {
      const { data, error } = await supabase.functions.invoke('job-acceptance', {
        body: {
          job_id: jobId,
          provider_id: profile.value.id,
        },
      })

      if (error) throw error

      if (data.success) {
        currentJob.value = data.job
        availableJobs.value = []
      }
    } catch (error) {
      console.error('Error accepting job:', error)
      throw error
    }
  }

  async function updateLocation(lat: number, lng: number): Promise<void> {
    if (!currentJob.value) return

    try {
      await supabase.rpc('update_provider_location', {
        p_job_id: currentJob.value.id,
        p_location: `POINT(${lng} ${lat})`,
      })
    } catch (error) {
      console.error('Error updating location:', error)
    }
  }

  async function loadTodayMetrics(): Promise<void> {
    if (!profile.value) return

    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      // Get today's earnings
      const { data: earnings, error: earningsError } = await supabase
        .from('earnings')
        .select('net_earnings')
        .eq('provider_id', profile.value.id)
        .gte('earned_at', today.toISOString())

      if (earningsError) throw earningsError

      todayEarnings.value = earnings?.reduce((sum, e) => sum + parseFloat(e.net_earnings), 0) || 0

      // Get today's completed trips
      const { data: jobs, error: jobsError } = await supabase
        .from('jobs')
        .select('id')
        .eq('provider_id', profile.value.id)
        .eq('status', 'completed')
        .gte('completed_at', today.toISOString())

      if (jobsError) throw jobsError

      todayTrips.value = jobs?.length || 0

      // Load performance metrics
      await loadPerformanceMetrics()
    } catch (error) {
      console.error('Error loading today metrics:', error)
      throw error
    }
  }

  async function loadPerformanceMetrics(): Promise<void> {
    if (!profile.value) return

    try {
      const { data, error } = await supabase
        .from('provider_performance_metrics')
        .select('*')
        .eq('provider_id', profile.value.id)
        .single()

      if (error) throw error

      if (data) {
        metrics.value = {
          rating: parseFloat(data.rating) || 0,
          acceptanceRate: parseFloat(data.acceptance_rate) || 0,
          completionRate: parseFloat(data.completion_rate) || 0,
          cancellationRate: parseFloat(data.cancellation_rate) || 0,
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
        .from('jobs')
        .select('*')
        .eq('provider_id', profile.value.id)
        .in('status', ['accepted', 'arrived', 'in_progress'])
        .single()

      if (error && error.code !== 'PGRST116') throw error

      currentJob.value = data || null
    } catch (error) {
      console.error('Error loading current job:', error)
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
  }

  async function setActiveServiceType(serviceType: string): Promise<void> {
    if (!profile.value?.service_types.includes(serviceType)) {
      throw new Error('Invalid service type')
    }

    activeServiceType.value = serviceType

    // Reload available jobs for this service type
    if (isOnline.value) {
      await loadAvailableJobs()
    }
  }

  async function loadEarningsByServiceType(serviceType: string): Promise<number> {
    if (!profile.value) return 0

    try {
      const { data, error } = await supabase
        .from('earnings')
        .select('net_earnings')
        .eq('provider_id', profile.value.id)
        .eq('service_type', serviceType)

      if (error) throw error

      return data?.reduce((sum, e) => sum + parseFloat(e.net_earnings), 0) || 0
    } catch (error) {
      console.error('Error loading earnings by service type:', error)
      return 0
    }
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

    // Getters
    canAcceptJobs,
    serviceTypes,

    // Actions
    loadProfile,
    toggleOnlineStatus,
    loadAvailableJobs,
    acceptJob,
    updateLocation,
    loadTodayMetrics,
    loadPerformanceMetrics,
    loadCurrentJob,
    setActiveServiceType,
    loadEarningsByServiceType,
    $reset,
  }
})
