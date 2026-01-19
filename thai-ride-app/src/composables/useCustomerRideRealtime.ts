/**
 * useCustomerRideRealtime - Realtime Updates for Customer Ride Tracking
 * 
 * Features:
 * - Subscribe to ride_requests table changes
 * - Detect provider reassignment (admin changed rider)
 * - Detect status changes
 * - Detect ride cancellation
 * - Auto-reload ride data when changes detected
 * 
 * Critical for UX:
 * - Customer sees new provider immediately when admin reassigns
 * - Customer sees status updates in real-time
 * - Customer gets notified if ride is cancelled
 */

import { ref, onUnmounted, watch } from 'vue'
import { supabase } from '../lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

export interface RideRealtimeUpdate {
  id: string
  status: string
  provider_id: string | null
  provider_name?: string
  updated_at: string
}

export interface RideRealtimeCallbacks {
  onProviderChanged?: (oldProviderId: string | null, newProviderId: string | null) => void
  onStatusChanged?: (oldStatus: string, newStatus: string) => void
  onRideCancelled?: (reason?: string) => void
  onRideUpdated?: (ride: RideRealtimeUpdate) => void
}

export function useCustomerRideRealtime(
  rideId: () => string | null | undefined,
  callbacks?: RideRealtimeCallbacks
) {
  const isSubscribed = ref(false)
  const lastUpdate = ref<Date | null>(null)
  const connectionStatus = ref<'connected' | 'connecting' | 'disconnected'>('disconnected')
  
  let channel: RealtimeChannel | null = null
  let previousRideState: RideRealtimeUpdate | null = null

  // Subscribe to ride updates
  function subscribe() {
    const currentRideId = rideId()
    if (!currentRideId || isSubscribed.value) return

    cleanup()
    connectionStatus.value = 'connecting'

    console.log('[CustomerRideRealtime] Subscribing to ride:', currentRideId)

    channel = supabase
      .channel(`customer-ride:${currentRideId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'ride_requests',
          filter: `id=eq.${currentRideId}`
        },
        async (payload) => {
          console.log('[CustomerRideRealtime] Ride updated:', payload)
          
          const newRide = payload.new as RideRealtimeUpdate
          lastUpdate.value = new Date()

          // Detect provider change (admin reassigned rider)
          if (previousRideState && previousRideState.provider_id !== newRide.provider_id) {
            console.log('[CustomerRideRealtime] Provider changed:', {
              old: previousRideState.provider_id,
              new: newRide.provider_id
            })
            
            callbacks?.onProviderChanged?.(
              previousRideState.provider_id,
              newRide.provider_id
            )
          }

          // Detect status change
          if (previousRideState && previousRideState.status !== newRide.status) {
            console.log('[CustomerRideRealtime] Status changed:', {
              old: previousRideState.status,
              new: newRide.status
            })
            
            callbacks?.onStatusChanged?.(
              previousRideState.status,
              newRide.status
            )

            // Check if cancelled
            if (newRide.status === 'cancelled') {
              callbacks?.onRideCancelled?.()
            }
          }

          // Update previous state
          previousRideState = newRide

          // Notify general update
          callbacks?.onRideUpdated?.(newRide)
        }
      )
      .subscribe((status) => {
        console.log('[CustomerRideRealtime] Subscription status:', status)
        
        if (status === 'SUBSCRIBED') {
          connectionStatus.value = 'connected'
          isSubscribed.value = true
          
          // Load initial state
          loadInitialState()
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          connectionStatus.value = 'disconnected'
          isSubscribed.value = false
          
          // Retry after 3 seconds
          setTimeout(() => {
            if (!isSubscribed.value) {
              subscribe()
            }
          }, 3000)
        } else if (status === 'CLOSED') {
          connectionStatus.value = 'disconnected'
          isSubscribed.value = false
        }
      })
  }

  // Load initial ride state
  async function loadInitialState() {
    const currentRideId = rideId()
    if (!currentRideId) return

    try {
      const { data, error } = await supabase
        .from('ride_requests')
        .select('id, status, provider_id, updated_at')
        .eq('id', currentRideId)
        .single()

      if (error) {
        console.error('[CustomerRideRealtime] Failed to load initial state:', error)
        return
      }

      if (data) {
        previousRideState = data as RideRealtimeUpdate
        console.log('[CustomerRideRealtime] Initial state loaded:', previousRideState)
      }
    } catch (err) {
      console.error('[CustomerRideRealtime] Exception loading initial state:', err)
    }
  }

  // Cleanup subscription
  function cleanup() {
    if (channel) {
      console.log('[CustomerRideRealtime] Cleaning up subscription')
      supabase.removeChannel(channel)
      channel = null
    }
    isSubscribed.value = false
    connectionStatus.value = 'disconnected'
    previousRideState = null
  }

  // Watch for ride ID changes
  watch(rideId, (newRideId, oldRideId) => {
    if (newRideId !== oldRideId) {
      if (newRideId) {
        subscribe()
      } else {
        cleanup()
      }
    }
  }, { immediate: true })

  // Cleanup on unmount
  onUnmounted(() => {
    cleanup()
  })

  return {
    isSubscribed,
    lastUpdate,
    connectionStatus,
    subscribe,
    cleanup
  }
}
