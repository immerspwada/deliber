/**
 * Feature: Multi-Role Ride Booking System V3
 * Composable: useProviderDashboardV3.ts
 * Description: Provider dashboard with race-safe acceptance and status management
 */

import { ref, computed, onUnmounted } from 'vue'
import { supabase } from '@/lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

// Types
interface RideRequest {
  id: string
  tracking_id: string
  user_id: string
  pickup_lat: number
  pickup_lng: number
  pickup_address: string
  destination_lat: number
  destination_lng: number
  destination_address: string
  vehicle_type: string
  estimated_fare: number
  status: string
  created_at: string
  distance?: number
}

interface AcceptResult {
  success: boolean
  rideId?: string
  error?: 'RIDE_ALREADY_ACCEPTED' | 'RIDE_NOT_FOUND'
}

interface CompleteResult {
  success: boolean
  finalFare: number
  providerEarnings: number
  platformFee: number
}

type RideStatus = 'matched' | 'arriving' | 'picked_up' | 'in_progress' | 'completed'

export function useProviderDashboardV3() {
  // State
  const availableRides = ref<RideRequest[]>([])
  const currentRide = ref<RideRequest | null>(null)
  const isOnline = ref(false)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const realtimeChannel = ref<RealtimeChannel | null>(null)

  /**
   * Accept a ride request (race-safe)
   */
  async function acceptRide(rideId: string): Promise<AcceptResult> {
    isLoading.value = true
    error.value = null

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Call atomic function
      const { data, error: rpcError } = await supabase.rpc('accept_ride_atomic', {
        p_ride_id: rideId,
        p_provider_id: user.id
      })

      if (rpcError) {
        // Handle race condition
        if (rpcError.message.includes('RIDE_ALREADY_ACCEPTED')) {
          return {
            success: false,
            error: 'RIDE_ALREADY_ACCEPTED'
          }
        } else if (rpcError.message.includes('RIDE_NOT_FOUND')) {
          return {
            success: false,
            error: 'RIDE_NOT_FOUND'
          }
        }
        throw rpcError
      }

      // Remove from available rides
      availableRides.value = availableRides.value.filter(r => r.id !== rideId)

      // Set as current ride
      const { data: ride } = await supabase
        .from('ride_requests')
        .select('*')
        .eq('id', rideId)
        .single()

      if (ride) {
        currentRide.value = ride as RideRequest
        await subscribeToCurrentRide()
      }

      return {
        success: true,
        rideId: data.ride_id
      }
    } catch (err: any) {
      error.value = err.message || 'เกิดข้อผิดพลาดในการรับงาน'
      return {
        success: false
      }
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Update ride status
   */
  async function updateRideStatus(rideId: string, status: RideStatus): Promise<void> {
    isLoading.value = true
    error.value = null

    try {
      const { error: updateError } = await supabase
        .from('ride_requests')
        .update({
          status,
          [`${status}_at`]: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', rideId)

      if (updateError) throw updateError

      // Update local state
      if (currentRide.value) {
        currentRide.value.status = status
      }
    } catch (err: any) {
      error.value = err.message || 'เกิดข้อผิดพลาดในการอัพเดทสถานะ'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Complete ride with optional fare adjustment
   */
  async function completeRide(rideId: string, actualFare?: number): Promise<CompleteResult> {
    isLoading.value = true
    error.value = null

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error: rpcError } = await supabase.rpc('complete_ride_atomic', {
        p_ride_id: rideId,
        p_provider_id: user.id,
        p_actual_fare: actualFare || null
      })

      if (rpcError) throw rpcError

      // Clear current ride
      currentRide.value = null

      // Unsubscribe
      if (realtimeChannel.value) {
        await supabase.removeChannel(realtimeChannel.value)
        realtimeChannel.value = null
      }

      return {
        success: true,
        finalFare: data.final_fare,
        providerEarnings: data.provider_earnings,
        platformFee: data.platform_fee
      }
    } catch (err: any) {
      error.value = err.message || 'เกิดข้อผิดพลาดในการจบงาน'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Cancel ride
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
        p_cancelled_by_role: 'provider',
        p_cancel_reason: reason
      })

      if (rpcError) throw rpcError

      // Clear current ride
      currentRide.value = null

      // Unsubscribe
      if (realtimeChannel.value) {
        await supabase.removeChannel(realtimeChannel.value)
        realtimeChannel.value = null
      }
    } catch (err: any) {
      error.value = err.message || 'เกิดข้อผิดพลาดในการยกเลิก'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Update provider location
   */
  async function updateLocation(lat: number, lng: number): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await supabase
        .from('service_providers')
        .update({
          current_lat: lat,
          current_lng: lng,
          last_location_update: new Date().toISOString()
        })
        .eq('id', user.id)
    } catch (err) {
      console.error('Failed to update location:', err)
    }
  }

  /**
   * Subscribe to new ride requests
   */
  async function subscribeToNewRides(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Get provider location
    const { data: provider } = await supabase
      .from('service_providers')
      .select('current_lat, current_lng')
      .eq('id', user.id)
      .single()

    if (!provider) return

    // Subscribe to new pending rides
    const channel = supabase
      .channel('new_rides')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ride_requests',
          filter: 'status=eq.pending'
        },
        async (payload) => {
          const newRide = payload.new as RideRequest

          // Calculate distance (simple Haversine)
          const distance = calculateDistance(
            provider.current_lat,
            provider.current_lng,
            newRide.pickup_lat,
            newRide.pickup_lng
          )

          // Only show rides within 5km
          if (distance <= 5) {
            newRide.distance = distance
            availableRides.value.push(newRide)
            
            // Sort by distance
            availableRides.value.sort((a, b) => (a.distance || 0) - (b.distance || 0))
          }
        }
      )
      .subscribe()

    realtimeChannel.value = channel
  }

  /**
   * Subscribe to current ride updates
   */
  async function subscribeToCurrentRide(): Promise<void> {
    if (!currentRide.value) return

    const channel = supabase
      .channel(`provider_ride:${currentRide.value.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'ride_requests',
          filter: `id=eq.${currentRide.value.id}`
        },
        (payload) => {
          currentRide.value = payload.new as RideRequest
        }
      )
      .subscribe()

    realtimeChannel.value = channel
  }

  /**
   * Calculate distance between two points (Haversine formula)
   */
  function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371 // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
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
    availableRides,
    currentRide,
    isOnline,
    isLoading,
    error,

    // Actions
    acceptRide,
    updateRideStatus,
    completeRide,
    cancelRide,
    updateLocation,
    subscribeToNewRides,
    subscribeToCurrentRide
  }
}
