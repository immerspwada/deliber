/**
 * Feature: Multi-Role Ride Booking System V3
 * Composable: useNetworkRecovery.ts
 * Description: Frontend monitoring for network recovery and stale ride detection
 */

import { ref, computed, onMounted, onUnmounted } from 'vue'
import { supabase } from '../lib/supabase'

interface StaleRideCheck {
  success: boolean
  cancelled_count: number
  reassigned_count: number
  checked_at: string
}

interface ProviderStatus {
  id: string
  status: string
  last_location_update: string
  current_ride_id: string | null
  is_online: boolean
  minutes_since_update: number
}

export function useNetworkRecovery() {
  // State
  const isMonitoring = ref(false)
  const lastCheckResult = ref<StaleRideCheck | null>(null)
  const offlineProviders = ref<ProviderStatus[]>([])
  const error = ref<string | null>(null)
  
  let monitoringInterval: NodeJS.Timeout | null = null

  /**
   * Manually trigger stale ride check
   */
  async function checkStaleRides(): Promise<StaleRideCheck | null> {
    error.value = null

    try {
      const { data, error: rpcError } = await supabase.rpc('check_stale_rides')

      if (rpcError) throw rpcError

      lastCheckResult.value = data as StaleRideCheck
      return data as StaleRideCheck
    } catch (err: any) {
      error.value = err.message || 'Failed to check stale rides'
      console.error('Error checking stale rides:', err)
      return null
    }
  }

  /**
   * Get list of providers who haven't updated location recently
   */
  async function getOfflineProviders(): Promise<ProviderStatus[]> {
    try {
      const { data, error: queryError } = await supabase
        .from('service_providers')
        .select('id, status, last_location_update, current_ride_id')
        .eq('status', 'busy')
        .not('current_ride_id', 'is', null)

      if (queryError) throw queryError

      const now = new Date()
      const providers = (data || []).map((provider: any) => {
        const lastUpdate = new Date(provider.last_location_update)
        const minutesSinceUpdate = Math.floor((now.getTime() - lastUpdate.getTime()) / 60000)
        
        return {
          ...provider,
          is_online: minutesSinceUpdate < 2,
          minutes_since_update: minutesSinceUpdate
        }
      })

      // Filter offline providers (no update for 2+ minutes)
      offlineProviders.value = providers.filter((p: ProviderStatus) => !p.is_online)
      
      return offlineProviders.value
    } catch (err: any) {
      error.value = err.message || 'Failed to get offline providers'
      console.error('Error getting offline providers:', err)
      return []
    }
  }

  /**
   * Start automatic monitoring
   * Checks for stale rides every 30 seconds
   */
  function startMonitoring(): void {
    if (isMonitoring.value) return

    isMonitoring.value = true

    // Initial check
    checkStaleRides()
    getOfflineProviders()

    // Set up interval (30 seconds)
    monitoringInterval = setInterval(() => {
      checkStaleRides()
      getOfflineProviders()
    }, 30000)
  }

  /**
   * Stop automatic monitoring
   */
  function stopMonitoring(): void {
    if (monitoringInterval) {
      clearInterval(monitoringInterval)
      monitoringInterval = null
    }
    isMonitoring.value = false
  }

  /**
   * Get provider cancellation statistics
   */
  async function getProviderCancellationStats(
    providerId: string,
    days: number = 30
  ): Promise<any> {
    try {
      const { data, error: rpcError } = await supabase.rpc(
        'get_provider_cancellation_stats',
        {
          p_provider_id: providerId,
          p_days: days
        }
      )

      if (rpcError) throw rpcError

      return data
    } catch (err: any) {
      error.value = err.message || 'Failed to get cancellation stats'
      console.error('Error getting cancellation stats:', err)
      return null
    }
  }

  /**
   * Subscribe to ride status changes for monitoring
   */
  function subscribeToRideStatusChanges(callback: (payload: any) => void): void {
    const channel = supabase
      .channel('ride_status_monitor')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'ride_requests',
          filter: 'status=in.(matched,arriving,picked_up,in_progress)'
        },
        callback
      )
      .subscribe()
  }

  // Computed
  const hasOfflineProviders = computed(() => offlineProviders.value.length > 0)
  const offlineProvidersCount = computed(() => offlineProviders.value.length)

  // Cleanup on unmount
  onUnmounted(() => {
    stopMonitoring()
  })

  return {
    // State
    isMonitoring,
    lastCheckResult,
    offlineProviders,
    error,

    // Computed
    hasOfflineProviders,
    offlineProvidersCount,

    // Actions
    checkStaleRides,
    getOfflineProviders,
    startMonitoring,
    stopMonitoring,
    getProviderCancellationStats,
    subscribeToRideStatusChanges
  }
}
