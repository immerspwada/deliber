import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import type { RideRequest, RideRequestInsert, ServiceProvider } from '../types/database'

export interface Location {
  lat: number
  lng: number
  address: string
}

export interface MatchedDriver {
  id: string
  name: string
  phone: string
  rating: number
  total_trips: number
  vehicle_type: string
  vehicle_color: string
  vehicle_plate: string
  avatar_url?: string
  current_lat: number
  current_lng: number
  eta: number
}

export const useRideStore = defineStore('ride', () => {
  const currentRide = ref<RideRequest | null>(null)
  const matchedDriver = ref<MatchedDriver | null>(null)
  const rideHistory = ref<RideRequest[]>([])
  const nearbyDrivers = ref<ServiceProvider[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const rideSubscription = ref<any>(null)
  const driverSubscription = ref<any>(null)

  const hasActiveRide = computed(() => 
    currentRide.value && 
    ['pending', 'matched', 'pickup', 'in_progress'].includes(currentRide.value.status || '')
  )

  // Calculate fare based on distance
  const calculateFare = (distanceKm: number, rideType: string): number => {
    const baseFare = 35 // Thai Baht
    const perKmRate = rideType === 'premium' ? 15 : rideType === 'shared' ? 8 : 10
    const minimumFare = rideType === 'premium' ? 80 : rideType === 'shared' ? 40 : 50
    
    const calculatedFare = baseFare + (distanceKm * perKmRate)
    return Math.max(calculatedFare, minimumFare)
  }

  // Helper function to calculate distance using Haversine formula
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371 // Earth's radius in km
    const dLat = toRad(lat2 - lat1)
    const dLng = toRad(lng2 - lng1)
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  const toRad = (deg: number): number => deg * (Math.PI / 180)

  // Initialize - restore active ride from database
  const initialize = async (userId: string) => {
    loading.value = true
    try {
      // Find any active ride for this user
      const { data: activeRide, error: fetchError } = await (supabase
        .from('ride_requests') as any)
        .select(`
          *,
          provider:provider_id (
            id,
            user_id,
            vehicle_type,
            vehicle_plate,
            vehicle_color,
            rating,
            total_trips,
            current_lat,
            current_lng,
            users:user_id (
              name,
              phone,
              avatar_url
            )
          )
        `)
        .eq('user_id', userId)
        .in('status', ['pending', 'matched', 'pickup', 'in_progress'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (!fetchError && activeRide) {
        currentRide.value = activeRide
        
        // Set matched driver if exists
        if (activeRide.provider) {
          const provider = activeRide.provider
          const user = provider.users
          matchedDriver.value = {
            id: provider.id,
            name: user?.name || 'คนขับ',
            phone: user?.phone || '',
            rating: provider.rating || 4.8,
            total_trips: provider.total_trips || 0,
            vehicle_type: provider.vehicle_type || 'รถยนต์',
            vehicle_color: provider.vehicle_color || 'สีดำ',
            vehicle_plate: provider.vehicle_plate || '',
            avatar_url: user?.avatar_url,
            current_lat: provider.current_lat,
            current_lng: provider.current_lng,
            eta: 5
          }
        }

        // Subscribe to ride updates
        subscribeToRideUpdates(activeRide.id)
      }
    } catch (err: any) {
      console.warn('No active ride found:', err.message)
    } finally {
      loading.value = false
    }
  }

  // Find nearby drivers
  const findNearbyDrivers = async (lat: number, lng: number, radiusKm: number = 5) => {
    loading.value = true
    error.value = null
    
    try {
      const { data, error: fetchError } = await (supabase.rpc as any)('find_nearby_providers', {
        lat,
        lng,
        radius_km: radiusKm,
        provider_type_filter: 'driver'
      })
      
      if (fetchError) {
        error.value = fetchError.message
        return []
      }
      
      nearbyDrivers.value = data || []
      return data || []
    } catch (err: any) {
      error.value = err.message
      return []
    } finally {
      loading.value = false
    }
  }

  // Create ride request
  const createRideRequest = async (
    userId: string,
    pickup: Location,
    destination: Location,
    rideType: 'standard' | 'premium' | 'shared' = 'standard',
    passengerCount: number = 1,
    specialRequests?: string
  ) => {
    loading.value = true
    error.value = null
    
    try {
      const distanceKm = calculateDistance(
        pickup.lat, pickup.lng,
        destination.lat, destination.lng
      )
      
      const estimatedFare = calculateFare(distanceKm, rideType)
      
      const rideData: RideRequestInsert = {
        user_id: userId,
        pickup_lat: pickup.lat,
        pickup_lng: pickup.lng,
        pickup_address: pickup.address,
        destination_lat: destination.lat,
        destination_lng: destination.lng,
        destination_address: destination.address,
        ride_type: rideType,
        passenger_count: passengerCount,
        special_requests: specialRequests,
        estimated_fare: estimatedFare,
        status: 'pending'
      }
      
      const { data, error: insertError } = await (supabase
        .from('ride_requests') as any)
        .insert(rideData)
        .select()
        .single()
      
      if (insertError) {
        error.value = insertError.message
        return null
      }
      
      currentRide.value = data
      
      // Subscribe to ride updates
      subscribeToRideUpdates(data.id)
      
      return data
    } catch (err: any) {
      error.value = err.message
      return null
    } finally {
      loading.value = false
    }
  }

  // Find and match driver for current ride
  const findAndMatchDriver = async () => {
    if (!currentRide.value) return null
    
    loading.value = true
    error.value = null

    try {
      // Find nearby drivers
      const drivers = await findNearbyDrivers(
        currentRide.value.pickup_lat,
        currentRide.value.pickup_lng,
        5
      )

      if (!drivers || drivers.length === 0) {
        error.value = 'ไม่พบคนขับในบริเวณใกล้เคียง'
        return null
      }

      // Get first available driver with user info
      const driver = drivers[0]
      const { data: providerData, error: providerError } = await (supabase
        .from('service_providers') as any)
        .select(`
          *,
          users:user_id (
            name,
            phone,
            avatar_url
          )
        `)
        .eq('id', driver.provider_id)
        .single()

      if (providerError || !providerData) {
        error.value = 'ไม่สามารถดึงข้อมูลคนขับได้'
        return null
      }

      // Update ride with matched driver
      const { data: updatedRide, error: updateError } = await (supabase
        .from('ride_requests') as any)
        .update({
          provider_id: providerData.id,
          status: 'matched'
        })
        .eq('id', currentRide.value.id)
        .select()
        .single()

      if (updateError) {
        error.value = updateError.message
        return null
      }

      currentRide.value = updatedRide

      // Set matched driver
      const user = providerData.users
      matchedDriver.value = {
        id: providerData.id,
        name: user?.name || 'คนขับ',
        phone: user?.phone || '',
        rating: providerData.rating || 4.8,
        total_trips: providerData.total_trips || 0,
        vehicle_type: providerData.vehicle_type || 'รถยนต์',
        vehicle_color: providerData.vehicle_color || 'สีดำ',
        vehicle_plate: providerData.vehicle_plate || '',
        avatar_url: user?.avatar_url,
        current_lat: providerData.current_lat,
        current_lng: providerData.current_lng,
        eta: Math.ceil((driver.distance_km || 1) * 2)
      }

      // Subscribe to driver location updates
      subscribeToDriverLocation(providerData.id)

      return matchedDriver.value
    } catch (err: any) {
      error.value = err.message
      return null
    } finally {
      loading.value = false
    }
  }

  // Cancel ride request
  const cancelRide = async (rideId?: string) => {
    const id = rideId || currentRide.value?.id
    if (!id) return false
    
    loading.value = true
    error.value = null
    
    try {
      const { error: updateError } = await (supabase
        .from('ride_requests') as any)
        .update({ status: 'cancelled' })
        .eq('id', id)
      
      if (updateError) {
        error.value = updateError.message
        return false
      }
      
      // Cleanup
      unsubscribeAll()
      currentRide.value = null
      matchedDriver.value = null
      
      return true
    } catch (err: any) {
      error.value = err.message
      return false
    } finally {
      loading.value = false
    }
  }

  // Complete ride
  const completeRide = async () => {
    if (!currentRide.value) return false
    
    loading.value = true
    try {
      const { error: updateError } = await (supabase
        .from('ride_requests') as any)
        .update({ status: 'completed' })
        .eq('id', currentRide.value.id)
      
      if (updateError) {
        error.value = updateError.message
        return false
      }
      
      // Cleanup
      unsubscribeAll()
      currentRide.value = null
      matchedDriver.value = null
      
      return true
    } catch (err: any) {
      error.value = err.message
      return false
    } finally {
      loading.value = false
    }
  }

  // Submit rating
  const submitRating = async (rating: number, tipAmount: number = 0, comment?: string) => {
    if (!currentRide.value || !matchedDriver.value) return false
    
    loading.value = true
    try {
      // Insert rating
      const { error: ratingError } = await (supabase
        .from('ride_ratings') as any)
        .insert({
          ride_id: currentRide.value.id,
          user_id: currentRide.value.user_id,
          provider_id: matchedDriver.value.id,
          rating,
          tip_amount: tipAmount,
          comment
        })

      if (ratingError) {
        console.warn('Rating error:', ratingError)
      }

      // Update provider rating average
      const { data: ratings } = await (supabase
        .from('ride_ratings') as any)
        .select('rating')
        .eq('provider_id', matchedDriver.value.id)

      if (ratings && ratings.length > 0) {
        const avgRating = ratings.reduce((sum: number, r: any) => sum + r.rating, 0) / ratings.length
        await (supabase
          .from('service_providers') as any)
          .update({
            rating: Math.round(avgRating * 100) / 100,
            total_trips: ratings.length
          })
          .eq('id', matchedDriver.value.id)
      }

      // Complete the ride
      await completeRide()
      
      return true
    } catch (err: any) {
      error.value = err.message
      return false
    } finally {
      loading.value = false
    }
  }

  // Get ride history
  const fetchRideHistory = async (userId: string) => {
    loading.value = true
    error.value = null
    
    try {
      const { data, error: fetchError } = await (supabase
        .from('ride_requests') as any)
        .select(`
          *,
          provider:provider_id (
            vehicle_type,
            vehicle_plate,
            rating,
            users:user_id (
              name
            )
          )
        `)
        .eq('user_id', userId)
        .in('status', ['completed', 'cancelled'])
        .order('created_at', { ascending: false })
        .limit(20)
      
      if (fetchError) {
        error.value = fetchError.message
        return []
      }
      
      rideHistory.value = data || []
      return data || []
    } catch (err: any) {
      error.value = err.message
      return []
    } finally {
      loading.value = false
    }
  }

  // Subscribe to ride updates
  const subscribeToRideUpdates = (rideId: string) => {
    // Unsubscribe from previous
    if (rideSubscription.value) {
      rideSubscription.value.unsubscribe()
    }

    rideSubscription.value = supabase
      .channel(`ride:${rideId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'ride_requests',
          filter: `id=eq.${rideId}`
        },
        (payload) => {
          currentRide.value = payload.new as RideRequest
          
          // If cancelled or completed, cleanup
          if (['cancelled', 'completed'].includes(payload.new.status)) {
            unsubscribeAll()
            currentRide.value = null
            matchedDriver.value = null
          }
        }
      )
      .subscribe()
    
    return rideSubscription.value
  }

  // Subscribe to driver location updates
  const subscribeToDriverLocation = (providerId: string) => {
    if (driverSubscription.value) {
      driverSubscription.value.unsubscribe()
    }

    driverSubscription.value = supabase
      .channel(`driver:${providerId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'service_providers',
          filter: `id=eq.${providerId}`
        },
        (payload) => {
          if (matchedDriver.value && payload.new.current_lat && payload.new.current_lng) {
            matchedDriver.value.current_lat = payload.new.current_lat
            matchedDriver.value.current_lng = payload.new.current_lng
          }
        }
      )
      .subscribe()
    
    return driverSubscription.value
  }

  // Unsubscribe from all channels
  const unsubscribeAll = () => {
    if (rideSubscription.value) {
      rideSubscription.value.unsubscribe()
      rideSubscription.value = null
    }
    if (driverSubscription.value) {
      driverSubscription.value.unsubscribe()
      driverSubscription.value = null
    }
  }

  // Reset state
  const reset = () => {
    unsubscribeAll()
    currentRide.value = null
    matchedDriver.value = null
    rideHistory.value = []
    nearbyDrivers.value = []
    error.value = null
  }

  return {
    currentRide,
    matchedDriver,
    rideHistory,
    nearbyDrivers,
    loading,
    error,
    hasActiveRide,
    calculateFare,
    calculateDistance,
    initialize,
    findNearbyDrivers,
    createRideRequest,
    findAndMatchDriver,
    cancelRide,
    completeRide,
    submitRating,
    fetchRideHistory,
    subscribeToRideUpdates,
    subscribeToDriverLocation,
    unsubscribeAll,
    reset
  }
})
