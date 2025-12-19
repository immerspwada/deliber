/**
 * Feature: Multi-Role Ride Booking System V3
 * Composable: useAdminRideMonitoring.ts
 * Description: Admin real-time ride monitoring with full access
 */

import { ref, computed, onUnmounted } from 'vue'
import { supabase } from '../lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

// Types
interface RideRequest {
  id: string
  tracking_id: string
  user_id: string
  provider_id: string | null
  pickup_address: string
  destination_address: string
  vehicle_type: string
  estimated_fare: number
  actual_fare: number | null
  status: string
  created_at: string
  matched_at: string | null
  completed_at: string | null
  cancelled_at: string | null
  cancellation_fee: number
  customer?: CustomerInfo
  provider?: ProviderInfo
}

interface CustomerInfo {
  id: string
  first_name: string
  last_name: string
  phone_number: string
  member_uid: string
}

interface ProviderInfo {
  id: string
  first_name: string
  last_name: string
  phone_number: string
  vehicle_plate_number: string
}

interface RideDetails extends RideRequest {
  audit_log: AuditLogEntry[]
  wallet_hold: WalletHold | null
}

interface AuditLogEntry {
  id: string
  old_status: string | null
  new_status: string
  changed_by: string
  changed_by_role: string
  metadata: any
  created_at: string
}

interface WalletHold {
  id: string
  amount: number
  status: string
  created_at: string
  released_at: string | null
}

interface CancellationLog {
  id: string
  provider_id: string
  ride_id: string
  reason: string
  cancelled_at: string
  provider_name: string
}

interface RideStats {
  total_active: number
  pending: number
  matched: number
  in_progress: number
  completed_today: number
  cancelled_today: number
}

export function useAdminRideMonitoring() {
  // State
  const activeRides = ref<RideRequest[]>([])
  const rideStats = ref<RideStats>({
    total_active: 0,
    pending: 0,
    matched: 0,
    in_progress: 0,
    completed_today: 0,
    cancelled_today: 0
  })
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const realtimeChannel = ref<RealtimeChannel | null>(null)

  /**
   * Get detailed ride information with audit trail
   */
  async function getRideDetails(rideId: string): Promise<RideDetails | null> {
    isLoading.value = true
    error.value = null

    try {
      // Get ride with customer and provider info
      const { data: ride, error: rideError } = await supabase
        .from('ride_requests')
        .select(`
          *,
          customer:users!ride_requests_user_id_fkey(
            id, first_name, last_name, phone_number, member_uid
          ),
          provider:service_providers!ride_requests_provider_id_fkey(
            id, first_name, last_name, phone_number, vehicle_plate_number
          )
        `)
        .eq('id', rideId)
        .single()

      if (rideError) throw rideError

      // Get audit log
      const { data: auditLog, error: auditError } = await supabase
        .from('status_audit_log')
        .select('*')
        .eq('entity_type', 'ride_request')
        .eq('entity_id', rideId)
        .order('created_at', { ascending: true })

      if (auditError) throw auditError

      // Get wallet hold
      const { data: walletHold } = await supabase
        .from('wallet_holds')
        .select('*')
        .eq('ride_id', rideId)
        .single()

      return {
        ...ride,
        audit_log: auditLog || [],
        wallet_hold: walletHold || null
      } as RideDetails
    } catch (err: any) {
      error.value = err.message || 'เกิดข้อผิดพลาดในการดึงข้อมูล'
      return null
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Cancel ride (admin privilege)
   */
  async function cancelRide(rideId: string, reason: string): Promise<void> {
    isLoading.value = true
    error.value = null

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error: rpcError } = await supabase.rpc('cancel_ride_atomic', {
        p_ride_id: rideId,
        p_cancelled_by: user.id,
        p_cancelled_by_role: 'admin',
        p_cancel_reason: reason
      })

      if (rpcError) throw rpcError

      // Remove from active rides
      activeRides.value = activeRides.value.filter(r => r.id !== rideId)
      updateStats()
    } catch (err: any) {
      error.value = err.message || 'เกิดข้อผิดพลาดในการยกเลิก'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Get provider cancellation history
   */
  async function getProviderCancellations(providerId: string): Promise<CancellationLog[]> {
    isLoading.value = true
    error.value = null

    try {
      const { data, error: queryError } = await supabase
        .from('provider_cancellation_log')
        .select(`
          *,
          provider:service_providers!provider_cancellation_log_provider_id_fkey(
            first_name, last_name
          )
        `)
        .eq('provider_id', providerId)
        .order('cancelled_at', { ascending: false })

      if (queryError) throw queryError

      return (data || []).map(log => ({
        ...log,
        provider_name: `${log.provider.first_name} ${log.provider.last_name}`
      }))
    } catch (err: any) {
      error.value = err.message || 'เกิดข้อผิดพลาดในการดึงข้อมูล'
      return []
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Subscribe to all active rides
   */
  async function subscribeToAllActiveRides(): Promise<void> {
    // Initial load
    await loadActiveRides()

    // Subscribe to changes
    const channel = supabase
      .channel('admin_live_rides')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ride_requests',
          filter: 'status=in.(pending,matched,arriving,picked_up,in_progress)'
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            // New ride created
            const newRide = payload.new as RideRequest
            activeRides.value.push(newRide)
          } else if (payload.eventType === 'UPDATE') {
            // Ride updated
            const updatedRide = payload.new as RideRequest
            const index = activeRides.value.findIndex(r => r.id === updatedRide.id)
            
            if (index !== -1) {
              // Check if still active
              if (['pending', 'matched', 'arriving', 'picked_up', 'in_progress'].includes(updatedRide.status)) {
                activeRides.value[index] = updatedRide
              } else {
                // Ride completed or cancelled, remove from active
                activeRides.value.splice(index, 1)
              }
            }
          } else if (payload.eventType === 'DELETE') {
            // Ride deleted
            activeRides.value = activeRides.value.filter(r => r.id !== payload.old.id)
          }

          updateStats()
        }
      )
      .subscribe()

    realtimeChannel.value = channel
  }

  /**
   * Load active rides
   */
  async function loadActiveRides(): Promise<void> {
    isLoading.value = true
    error.value = null

    try {
      const { data, error: queryError } = await supabase
        .from('ride_requests')
        .select(`
          *,
          customer:users!ride_requests_user_id_fkey(
            id, first_name, last_name, phone_number, member_uid
          ),
          provider:service_providers!ride_requests_provider_id_fkey(
            id, first_name, last_name, phone_number, vehicle_plate_number
          )
        `)
        .in('status', ['pending', 'matched', 'arriving', 'picked_up', 'in_progress'])
        .order('created_at', { ascending: false })

      if (queryError) throw queryError

      activeRides.value = data || []
      updateStats()
    } catch (err: any) {
      error.value = err.message || 'เกิดข้อผิดพลาดในการดึงข้อมูล'
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Update statistics
   */
  function updateStats(): void {
    rideStats.value = {
      total_active: activeRides.value.length,
      pending: activeRides.value.filter(r => r.status === 'pending').length,
      matched: activeRides.value.filter(r => r.status === 'matched').length,
      in_progress: activeRides.value.filter(r => ['picked_up', 'in_progress'].includes(r.status)).length,
      completed_today: 0, // Would need separate query
      cancelled_today: 0  // Would need separate query
    }
  }

  /**
   * Cleanup on unmount
   */
  onUnmounted(async () => {
    if (realtimeChannel.value) {
      await supabase.removeChannel(realtimeChannel.value)
    }
  })

  return {
    // State
    activeRides,
    rideStats,
    isLoading,
    error,

    // Actions
    getRideDetails,
    cancelRide,
    getProviderCancellations,
    subscribeToAllActiveRides,
    loadActiveRides
  }
}
