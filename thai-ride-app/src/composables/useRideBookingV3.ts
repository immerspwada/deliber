/**
 * Feature: Multi-Role Ride Booking System V3
 * Composable: useRideBookingV3.ts
 * Description: Customer ride booking with atomic transactions and realtime updates
 */

import { ref, computed, onUnmounted } from 'vue'
import { supabase } from '@/lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

// Types
interface Location {
  lat: number
  lng: number
  address: string
}

interface CreateRideParams {
  pickup: Location
  destination: Location
  vehicleType: 'car' | 'motorcycle' | 'van'
  estimatedFare: number
  promoCode?: string
}

interface RideRequest {
  id: string
  tracking_id: string
  user_id: string
  provider_id: string | null
  pickup_lat: number
  pickup_lng: number
  pickup_address: string
  destination_lat: number
  destination_lng: number
  destination_address: string
  vehicle_type: string
  estimated_fare: number
  actual_fare: number | null
  status: RideStatus
  created_at: string
  matched_at: string | null
  completed_at: string | null
  cancelled_at: string | null
  provider?: ProviderInfo
}

interface ProviderInfo {
  id: string
  name: string
  phone: string
  vehicle_plate: string
  current_lat: number | null
  current_lng: number | null
  rating: number | null
}

type RideStatus = 'pending' | 'matched' | 'arriving' | 'picked_up' | 'in_progress' | 'completed' | 'cancelled'

interface RideResult {
  rideId: string
  trackingId: string
  status: 'pending'
  estimatedFare: number
  walletHeld: number
}

export function useRideBookingV3() {
  // State
  const currentRide = ref<RideRequest | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const realtimeChannel = ref<RealtimeChannel | null>(null)

  // Computed
  const rideStatus = computed(() => currentRide.value?.status || null)
  const providerInfo = computed(() => currentRide.value?.provider || null)
  const estimatedArrival = computed(() => {
    // Calculate ETA based on provider location and destination
    // This is a placeholder - implement actual ETA calculation
    return null
  })

  /**
   * Create a new ride request with atomic wallet hold
   */
  async function createRide(params: CreateRideParams): Promise<RideResult> {
    isLoading.value = true
    error.value = null

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Call atomic function
      const { data, error: rpcError } = await supabase.rpc('create_ride_atomic', {
        p_user_id: user.id,
        p_pickup_lat: params.pickup.lat,
        p_pickup_lng: params.pickup.lng,
        p_pickup_address: params.pickup.address,
        p_destination_lat: params.destination.lat,
        p_destination_lng: params.destination.lng,
        p_destination_address: params.destination.address,
        p_vehicle_type: params.vehicleType,
        p_estimated_fare: params.estimatedFare,
        p_promo_code: params.promoCode || null
      })

      if (rpcError) {
        // Handle specific errors
        if (rpcError.message.includes('INSUFFICIENT_BALANCE')) {
          throw new Error('ยอดเงินไม่เพียงพอ กรุณาเติมเงินก่อนเรียกรถ')
        } else if (rpcError.message.includes('WALLET_NOT_FOUND')) {
          throw new Error('ไม่พบกระเป๋าเงิน กรุณาติดต่อฝ่ายสนับสนุน')
        }
        throw rpcError
      }

      // Subscribe to ride updates
      if (data.ride_id) {
        await subscribeToRideUpdates(data.ride_id)
      }

      return {
        rideId: data.ride_id,
        trackingId: data.tracking_id,
        status: 'pending',
        estimatedFare: data.estimated_fare,
        walletHeld: data.wallet_held
      }
    } catch (err: any) {
      error.value = err.message || 'เกิดข้อผิดพลาดในการสร้างคำขอเรียกรถ'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Cancel current ride
   */
  async function cancelRide(rideId: string, reason: string): Promise<void> {
    isLoading.value = true
    error.value = null

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error: rpcError } = await supabase.rpc('cancel_ride_atomic', {
        p_ride_id: rideId,
        p_cancelled_by: user.id,
        p_cancelled_by_role: 'customer',
        p_cancel_reason: reason
      })

      if (rpcError) throw rpcError

      // Clear current ride
      currentRide.value = null

      // Unsubscribe from updates
      if (realtimeChannel.value) {
        await supabase.removeChannel(realtimeChannel.value)
        realtimeChannel.value = null
      }

      return data
    } catch (err: any) {
      error.value = err.message || 'เกิดข้อผิดพลาดในการยกเลิก'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Subscribe to realtime ride updates
   */
  async function subscribeToRideUpdates(rideId: string): Promise<void> {
    // Unsubscribe from previous channel if exists
    if (realtimeChannel.value) {
      await supabase.removeChannel(realtimeChannel.value)
    }

    // Subscribe to ride changes
    const channel = supabase
      .channel(`ride:${rideId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'ride_requests',
          filter: `id=eq.${rideId}`
        },
        async (payload) => {
          const newRide = payload.new as RideRequest

          // Fetch provider info if matched
          if (newRide.provider_id && newRide.status === 'matched') {
            const { data: provider } = await supabase
              .from('service_providers')
              .select('id, first_name, last_name, phone_number, vehicle_plate_number, current_lat, current_lng, rating')
              .eq('id', newRide.provider_id)
              .single()

            if (provider) {
              newRide.provider = {
                id: provider.id,
                name: `${provider.first_name} ${provider.last_name}`,
                phone: provider.phone_number,
                vehicle_plate: provider.vehicle_plate_number,
                current_lat: provider.current_lat,
                current_lng: provider.current_lng,
                rating: provider.rating
              }
            }
          }

          currentRide.value = newRide

          // Handle status changes
          handleStatusChange(newRide.status)
        }
      )
      .subscribe()

    realtimeChannel.value = channel

    // Fetch initial ride data
    const { data: ride } = await supabase
      .from('ride_requests')
      .select('*')
      .eq('id', rideId)
      .single()

    if (ride) {
      currentRide.value = ride as RideRequest
    }
  }

  /**
   * Handle status change notifications
   */
  function handleStatusChange(status: RideStatus): void {
    // You can add toast notifications or sound alerts here
    switch (status) {
      case 'matched':
        console.log('🎉 พบคนขับแล้ว!')
        break
      case 'arriving':
        console.log('🚗 คนขับกำลังมาหาคุณ')
        break
      case 'picked_up':
        console.log('✅ เริ่มเดินทาง')
        break
      case 'completed':
        console.log('🏁 เดินทางเสร็จสิ้น')
        break
      case 'cancelled':
        console.log('❌ การเดินทางถูกยกเลิก')
        break
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
    currentRide,
    isLoading,
    error,

    // Computed
    rideStatus,
    providerInfo,
    estimatedArrival,

    // Actions
    createRide,
    cancelRide,
    subscribeToRideUpdates
  }
}
