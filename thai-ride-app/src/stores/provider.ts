import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import type { ServiceProvider, RideRequest, DeliveryRequest } from '../types/database'

export type ServiceRequest = {
  id: string
  type: 'ride' | 'delivery' | 'shopping'
  status: string
  fare: number
  distance?: number
  pickupAddress: string
  destinationAddress: string
  pickupLat: number
  pickupLng: number
  destinationLat: number
  destinationLng: number
  createdAt: string
}

export const useProviderStore = defineStore('provider', () => {
  const provider = ref<ServiceProvider | null>(null)
  const isOnline = ref(false)
  const currentLocation = ref<{ lat: number; lng: number } | null>(null)
  const pendingRequests = ref<ServiceRequest[]>([])
  const activeRequest = ref<ServiceRequest | null>(null)
  const todayEarnings = ref(0)
  const todayTrips = ref(0)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const hasActiveRequest = computed(() => activeRequest.value !== null)

  // Fetch provider profile
  const fetchProviderProfile = async (userId: string) => {
    loading.value = true
    error.value = null
    
    try {
      const { data, error: fetchError } = await supabase
        .from('service_providers')
        .select('*')
        .eq('user_id', userId)
        .single()
      
      if (fetchError) {
        error.value = fetchError.message
        return null
      }
      
      provider.value = data as ServiceProvider
      isOnline.value = (data as ServiceProvider)?.is_available || false
      return data as ServiceProvider
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      return null
    } finally {
      loading.value = false
    }
  }

  // Toggle online status
  const toggleOnlineStatus = async () => {
    if (!provider.value) return false
    
    const newStatus = !isOnline.value
    
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: updateError } = await (supabase as any)
        .from('service_providers')
        .update({ 
          is_online: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', provider.value.id)
      
      if (updateError) {
        error.value = updateError.message
        return false
      }
      
      isOnline.value = newStatus
      
      if (newStatus) {
        // Start listening for requests when going online
        subscribeToRequests()
      } else {
        // Clear pending requests when going offline
        pendingRequests.value = []
      }
      
      return true
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      return false
    }
  }

  // Update current location
  const updateLocation = async (lat: number, lng: number) => {
    if (!provider.value) return false
    
    currentLocation.value = { lat, lng }
    
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: updateError } = await (supabase as any)
        .from('service_providers')
        .update({ 
          current_lat: lat,
          current_lng: lng,
          updated_at: new Date().toISOString()
        })
        .eq('id', provider.value.id)
      
      if (updateError) {
        console.error('Failed to update location:', updateError)
        return false
      }
      
      return true
    } catch (err) {
      console.error('Location update error:', err)
      return false
    }
  }

  // Accept a request
  const acceptRequest = async (request: ServiceRequest) => {
    if (!provider.value) return false
    
    loading.value = true
    
    try {
      const tableName = request.type === 'ride' 
        ? 'ride_requests' 
        : request.type === 'delivery' 
          ? 'delivery_requests' 
          : 'shopping_requests'
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: updateError } = await (supabase as any)
        .from(tableName)
        .update({ 
          provider_id: provider.value.id,
          status: 'matched',
          updated_at: new Date().toISOString()
        })
        .eq('id', request.id)
      
      if (updateError) {
        error.value = updateError.message
        return false
      }
      
      activeRequest.value = { ...request, status: 'matched' }
      pendingRequests.value = pendingRequests.value.filter(r => r.id !== request.id)
      
      return true
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      return false
    } finally {
      loading.value = false
    }
  }

  // Complete a request
  const completeRequest = async () => {
    if (!provider.value || !activeRequest.value) return false
    
    loading.value = true
    
    try {
      const tableName = activeRequest.value.type === 'ride' 
        ? 'ride_requests' 
        : activeRequest.value.type === 'delivery' 
          ? 'delivery_requests' 
          : 'shopping_requests'
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: updateError } = await (supabase as any)
        .from(tableName)
        .update({ 
          status: 'completed',
          actual_fare: activeRequest.value.fare,
          updated_at: new Date().toISOString()
        })
        .eq('id', activeRequest.value.id)
      
      if (updateError) {
        error.value = updateError.message
        return false
      }
      
      // Update earnings
      todayEarnings.value += activeRequest.value.fare
      todayTrips.value += 1
      
      activeRequest.value = null
      
      return true
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      return false
    } finally {
      loading.value = false
    }
  }

  // Subscribe to nearby requests
  const subscribeToRequests = () => {
    if (!provider.value) return

    // Subscribe to ride requests
    supabase
      .channel('ride_requests_channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ride_requests',
          filter: 'status=eq.pending'
        },
        (payload) => {
          const ride = payload.new as RideRequest
          // Check if within service radius (simplified)
          const request: ServiceRequest = {
            id: ride.id,
            type: 'ride',
            status: ride.status || 'pending',
            fare: ride.estimated_fare || 0,
            pickupAddress: ride.pickup_address,
            destinationAddress: ride.destination_address,
            pickupLat: ride.pickup_lat,
            pickupLng: ride.pickup_lng,
            destinationLat: ride.destination_lat,
            destinationLng: ride.destination_lng,
            createdAt: ride.created_at || new Date().toISOString()
          }
          pendingRequests.value.unshift(request)
        }
      )
      .subscribe()

    // Subscribe to delivery requests
    supabase
      .channel('delivery_requests_channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'delivery_requests',
          filter: 'status=eq.pending'
        },
        (payload) => {
          const delivery = payload.new as DeliveryRequest
          const request: ServiceRequest = {
            id: delivery.id,
            type: 'delivery',
            status: delivery.status || 'pending',
            fare: delivery.estimated_fee || 0,
            pickupAddress: delivery.sender_address,
            destinationAddress: delivery.recipient_address,
            pickupLat: delivery.sender_lat,
            pickupLng: delivery.sender_lng,
            destinationLat: delivery.recipient_lat,
            destinationLng: delivery.recipient_lng,
            createdAt: delivery.created_at || new Date().toISOString()
          }
          pendingRequests.value.unshift(request)
        }
      )
      .subscribe()
  }

  // Fetch today's stats
  const fetchTodayStats = async () => {
    if (!provider.value) return
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    try {
      // Fetch completed rides today
      const { data: rides } = await supabase
        .from('ride_requests')
        .select('actual_fare')
        .eq('provider_id', provider.value.id)
        .eq('status', 'completed')
        .gte('updated_at', today.toISOString())
      
      // Fetch completed deliveries today
      const { data: deliveries } = await supabase
        .from('delivery_requests')
        .select('actual_fee')
        .eq('provider_id', provider.value.id)
        .eq('status', 'delivered')
        .gte('updated_at', today.toISOString())
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rideEarnings = rides?.reduce((sum: number, r: any) => sum + (r.actual_fare || 0), 0) || 0
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const deliveryEarnings = deliveries?.reduce((sum: number, d: any) => sum + (d.actual_fee || 0), 0) || 0
      
      todayEarnings.value = rideEarnings + deliveryEarnings
      todayTrips.value = (rides?.length || 0) + (deliveries?.length || 0)
    } catch (err) {
      console.error('Failed to fetch stats:', err)
    }
  }

  return {
    provider,
    isOnline,
    currentLocation,
    pendingRequests,
    activeRequest,
    todayEarnings,
    todayTrips,
    loading,
    error,
    hasActiveRequest,
    fetchProviderProfile,
    toggleOnlineStatus,
    updateLocation,
    acceptRequest,
    completeRequest,
    subscribeToRequests,
    fetchTodayStats
  }
})
