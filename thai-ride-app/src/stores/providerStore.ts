/**
 * Provider Store V2 - Production Ready
 * Integrated with production composables
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import { useProviderJobs } from '../composables/useProviderJobs'
import { useProviderLocation } from '../composables/useProviderLocation'
import type { Provider, Job, Earnings, PerformanceMetrics, Notification } from '../types/provider'

 
type AnySupabase = any

const DEFAULT_EARNINGS: Earnings = {
  today: 0, this_week: 0, this_month: 0, total: 0,
  today_jobs: 0, week_jobs: 0, month_jobs: 0, total_jobs: 0,
  average_per_job: 0, peak_hours_earnings: 0, off_peak_earnings: 0,
}

const DEFAULT_METRICS: PerformanceMetrics = {
  rating: 5.0, total_ratings: 0, acceptance_rate: 100, completion_rate: 100,
  cancellation_rate: 0, on_time_rate: 100, average_response_time: 0,
  average_job_duration: 0, online_hours_today: 0, online_hours_week: 0,
}

export const useProviderStore = defineStore('provider-v2', () => {
  // Initialize composables
  const jobsComposable = useProviderJobs()
  const locationComposable = useProviderLocation()
  
  const provider = ref<Provider | null>(null)
  const earnings = ref<Earnings>({ ...DEFAULT_EARNINGS })
  const metrics = ref<PerformanceMetrics>({ ...DEFAULT_METRICS })
  const notifications = ref<Notification[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Use composable state
  const currentJob = computed(() => jobsComposable.currentJob.value)
  const availableJobs = computed(() => jobsComposable.availableJobs.value)
  const jobHistory = computed(() => jobsComposable.jobHistory.value)
  const isTracking = computed(() => locationComposable.isTracking.value)
  const currentLocation = computed(() => locationComposable.currentLocation.value)

  // Getters
  const isOnline = computed(() => provider.value?.is_online ?? false)
  const isAvailable = computed(() => provider.value?.is_available ?? false)
  const isVerified = computed(() => {
    const s = provider.value?.status
    return s === 'approved' || s === 'active'
  })
  const canAcceptJobs = computed(() => isVerified.value && isOnline.value && isAvailable.value && !currentJob.value)
  const serviceTypes = computed(() => provider.value?.service_types ?? [])
  const primaryService = computed(() => provider.value?.primary_service)
  const unreadNotifications = computed(() => notifications.value.filter(n => !n.is_read).length)

  // Load provider profile from providers_v2
  async function loadProfile(): Promise<Provider | null> {
    loading.value = true
    error.value = null
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { error.value = 'ไม่ได้เข้าสู่ระบบ'; return null }

      const { data, error: e } = await supabase
        .from('providers_v2')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (e) { 
        console.error('[Store] loadProfile:', e)
        error.value = 'ไม่สามารถโหลดข้อมูลได้'
        return null 
      }

      if (data) {
        provider.value = data as Provider
        // Populate earnings/metrics from provider data
        const d = data as Record<string, unknown>
        if (d.rating) metrics.value.rating = d.rating as number
        // DB uses total_trips, map to total_jobs
        const totalTrips = (d.total_trips as number) ?? (d.total_jobs as number) ?? 0
        if (totalTrips) {
          metrics.value.total_ratings = totalTrips
          earnings.value.total_jobs = totalTrips
        }
        if (d.total_earnings) earnings.value.total = d.total_earnings as number
        if (d.completion_rate) metrics.value.completion_rate = d.completion_rate as number
        if (d.acceptance_rate) metrics.value.acceptance_rate = d.acceptance_rate as number
        if (d.cancellation_rate) metrics.value.cancellation_rate = d.cancellation_rate as number
        return data as Provider
      }
      return null
    } catch (err) {
      console.error('[Store] loadProfile:', err)
      error.value = 'เกิดข้อผิดพลาด'
      return null
    } finally {
      loading.value = false
    }
  }

  // Toggle online status
  async function toggleOnlineStatus(): Promise<boolean> {
    if (!provider.value) return false
    loading.value = true
    const newStatus = !provider.value.is_online
    try {
      const sb = supabase as AnySupabase
      const { data, error: e } = await sb
        .from('providers_v2')
        .update({ 
          is_online: newStatus, 
          is_available: newStatus, // Set availability same as online
          updated_at: new Date().toISOString() 
        })
        .eq('id', provider.value.id)
        .select()
        .single()

      if (e) {
        console.error('[Store] toggle:', e)
        error.value = 'ไม่สามารถเปลี่ยนสถานะได้'
        return false
      }
      if (data) {
        provider.value = { ...provider.value, ...data } as Provider
        
        // Start/stop location tracking
        if (newStatus) {
          await locationComposable.startTracking()
          // Subscribe to new jobs
          jobsComposable.subscribeToNewJobs()
          // Load available jobs
          await jobsComposable.loadAvailableJobs()
        } else {
          locationComposable.stopTracking()
          // Cleanup job subscriptions
          jobsComposable.cleanup()
        }
        
        return true
      }
      return false
    } catch (err) {
      console.error('[Store] toggle:', err)
      error.value = 'เกิดข้อผิดพลาด'
      return false
    } finally {
      loading.value = false
    }
  }

  // Load available jobs - use composable
  async function loadAvailableJobs(): Promise<Job[]> {
    return await jobsComposable.loadAvailableJobs()
  }

  // Accept job - use composable
  async function acceptJob(jobId: string): Promise<boolean> {
    const result = await jobsComposable.acceptJob(jobId)
    return result.success
  }

  // Load current job - use composable
  async function loadCurrentJob(): Promise<Job | null> {
    return await jobsComposable.loadCurrentJob()
  }

  // Update job status - use composable
  async function updateJobStatus(jobId: string, status: Job['status']): Promise<boolean> {
    const result = await jobsComposable.updateJobStatus(jobId, status)
    return result.success
  }

  // Load earnings - use provider data directly (no Edge Function)
  async function loadEarnings(): Promise<Earnings> {
    if (!provider.value) return earnings.value
    
    // Use data from provider record
    const p = provider.value as unknown as Record<string, unknown>
    const totalTrips = (p.total_trips as number) ?? (p.total_jobs as number) ?? 0
    const totalEarnings = (p.total_earnings as number) ?? 0
    earnings.value = {
      ...DEFAULT_EARNINGS,
      total: totalEarnings,
      total_jobs: totalTrips,
      average_per_job: totalTrips ? totalEarnings / totalTrips : 0
    }
    return earnings.value
  }

  // Load metrics - use provider data directly (no Edge Function)
  async function loadMetrics(): Promise<PerformanceMetrics> {
    if (!provider.value) return metrics.value
    
    // Use data from provider record
    const p = provider.value as unknown as Record<string, unknown>
    const totalTrips = (p.total_trips as number) ?? (p.total_jobs as number) ?? 0
    metrics.value = {
      ...DEFAULT_METRICS,
      rating: (p.rating as number) ?? 5.0,
      total_ratings: totalTrips,
      acceptance_rate: (p.acceptance_rate as number) ?? 100,
      completion_rate: (p.completion_rate as number) ?? 100,
      cancellation_rate: (p.cancellation_rate as number) ?? 0,
    }
    return metrics.value
  }

  // Load notifications - skip (table doesn't exist)
  async function loadNotifications(): Promise<Notification[]> {
    notifications.value = []
    return []
  }

  // Mark notification as read - placeholder
  async function markNotificationAsRead(_notificationId: string): Promise<boolean> {
    return false
  }

  // Start location tracking - use composable
  async function startLocationTracking(): Promise<void> {
    await locationComposable.startTracking()
  }

  // Stop location tracking - use composable
  function stopLocationTracking(): void {
    locationComposable.stopTracking()
  }

  // Realtime subscriptions
  function initializeRealtimeSubscriptions(): void {
    if (!provider.value) return
    
    supabase
      .channel(`provider-${provider.value.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'providers_v2',
        filter: `id=eq.${provider.value.id}`
      }, (payload) => {
        if (payload.new) {
          provider.value = { ...provider.value, ...payload.new } as Provider
        }
      })
      .subscribe()
  }

  // Cleanup
  function cleanup(): void {
    stopLocationTracking()
    jobsComposable.cleanup()
    provider.value = null
    notifications.value = []
    earnings.value = { ...DEFAULT_EARNINGS }
    metrics.value = { ...DEFAULT_METRICS }
    error.value = null
    loading.value = false
  }

  return {
    // State
    provider, earnings, metrics, notifications, loading, error,
    // Computed from composables
    currentJob, availableJobs, jobHistory, isTracking, currentLocation,
    // Getters
    isOnline, isAvailable, isVerified, canAcceptJobs, serviceTypes, primaryService, unreadNotifications,
    // Actions
    loadProfile, toggleOnlineStatus, loadAvailableJobs, acceptJob, loadCurrentJob, updateJobStatus,
    loadEarnings, loadMetrics, loadNotifications, markNotificationAsRead,
    initializeRealtimeSubscriptions, startLocationTracking, stopLocationTracking, cleanup,
  }
})
