/**
 * useRideStore - Customer Ride Store
 * 
 * Feature: F02 - Ride Booking
 * Tables: ride_requests, service_providers
 * 
 * @syncs-with
 * - Admin: useAdmin.ts (ดู/จัดการออเดอร์, refund)
 * - Provider: useProvider.ts (รับงาน/อัพเดทสถานะ)
 * - Database: Realtime subscription on ride_requests
 * - Notifications: Push notification เมื่อสถานะเปลี่ยน
 * 
 * @status-flow
 * Customer: createRide → [pending]
 * Provider: acceptRide → [matched] → [pickup] → [in_progress] → [completed]
 * Customer: trackRide, rateRide
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'

import { useRequestDedup, RequestKeys } from '../composables/useRequestDedup'
import { rideLogger as logger } from '../utils/logger'
import { fromSupabaseError, handleError } from '../utils/errorHandling'
import type { RideRequest, ServiceProvider } from '../types/database'
import type { RealtimeChannel } from '@supabase/supabase-js'

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
  const rideSubscription = ref<RealtimeChannel | null>(null)
  const driverSubscription = ref<RealtimeChannel | null>(null)
  

  const { dedupRequest } = useRequestDedup()

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
    // ปัดเศษให้เป็นจำนวนเต็ม
    return Math.round(Math.max(calculatedFare, minimumFare))
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
    error.value = null
    
    try {
      const { data, error: queryError } = await supabase
        .from('ride_requests')
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
        .maybeSingle()

      if (queryError) {
        throw queryError
      }

      if (data) {
        currentRide.value = data
        
        // Set matched driver if exists
        const provider = (data as any).provider
        if (provider) {
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
        subscribeToRideUpdates((data as any).id)
      }
    } catch (err) {
      const appError = handleError(err, { logToSentry: false })
      error.value = appError.message
      logger.warn('No active ride found:', appError.message)
    } finally {
      loading.value = false
    }
  }

  // Find nearby drivers
  const findNearbyDrivers = async (lat: number, lng: number, radiusKm: number = 5) => {
    loading.value = true
    error.value = null
    
    try {
      // Use request deduplication with location-based cache key
      const cacheKey = `nearby_drivers_${lat.toFixed(3)}_${lng.toFixed(3)}_${radiusKm}`
      
      const data = await dedupRequest<ServiceProvider[]>(
        cacheKey,
        async () => {
          const { data: result, error: fetchError } = await (supabase.rpc as any)('find_nearby_providers', {
            lat: lat,
            lng: lng,
            radius_km: radiusKm,
            provider_type_filter: 'driver'
          })
          
          if (fetchError) {
            throw fromSupabaseError(fetchError)
          }
          
          return (result || []) as ServiceProvider[]
        },
        { ttl: 30000 } // Cache for 30 seconds
      )
      
      nearbyDrivers.value = data
      return data
    } catch (err) {
      const appError = handleError(err, { logToSentry: false })
      error.value = appError.message
      nearbyDrivers.value = []
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
    specialRequests?: string,
    scheduledAt?: string // ISO datetime string for scheduled rides
  ) => {
    loading.value = true
    error.value = null
    
    try {
      // Calculate distance and fare
      const distanceKm = calculateDistance(
        pickup.lat, pickup.lng,
        destination.lat, destination.lng
      )
      const estimatedFare = calculateFare(distanceKm, rideType)
      
      console.log('[createRideRequest] Starting...', {
        userId,
        pickup: pickup.address,
        destination: destination.address,
        rideType,
        estimatedFare
      })
      
      // Generate tracking ID
      const trackingId = `RID-${Date.now().toString(36).toUpperCase()}`
      
      // Create ride request directly with supabase
      const insertPayload: Record<string, unknown> = {
        user_id: userId,
        tracking_id: trackingId,
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
        status: scheduledAt ? 'scheduled' : 'pending',
        scheduled_time: scheduledAt || null
      }
      
      console.log('[createRideRequest] Insert payload:', insertPayload)
      
      const { data: rideData, error: insertError } = await (supabase as any)
        .from('ride_requests')
        .insert(insertPayload)
        .select()
        .single()
      
      if (insertError) {
        console.error('[createRideRequest] Insert error:', {
          message: insertError.message,
          code: insertError.code,
          details: insertError.details,
          hint: insertError.hint
        })
        
        // Check if it's a foreign key error (demo user not in DB)
        if (insertError.code === '23503') {
          error.value = 'ไม่พบข้อมูลผู้ใช้ในระบบ กรุณาเข้าสู่ระบบใหม่'
          console.error('[createRideRequest] Foreign key error - user_id not found in users table')
        }
        
        throw insertError
      }
      
      console.log('[createRideRequest] ✓ Success! Ride created:', {
        id: rideData?.id,
        tracking_id: rideData?.tracking_id,
        status: rideData?.status
      })
      
      currentRide.value = rideData as RideRequest
      
      // Subscribe to ride updates
      subscribeToRideUpdates(rideData.id)
      
      return { rideId: rideData.id, estimatedFare, trackingId }
    } catch (err) {
      const appError = handleError(err)
      error.value = appError.message
      console.error('[createRideRequest] Final error:', appError.message)
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
      const { data: providerData, error: providerError } = await supabase
        .from('service_providers')
        .select(`
          *,
          users:user_id (
            name,
            phone,
            avatar_url
          )
        `)
        .eq('id', (driver as any).provider_id)
        .single()

      if (providerError || !providerData) {
        error.value = 'ไม่สามารถดึงข้อมูลคนขับได้'
        return null
      }

      const provider = providerData as any

      // Update ride with matched driver
      const updatePayload = {
        provider_id: provider.id,
        status: 'matched'
      }
      const { data: updateData, error: updateError } = await (supabase as any)
        .from('ride_requests')
        .update(updatePayload)
        .eq('id', currentRide.value!.id)
        .select()
        .single()

      if (updateError || !updateData) {
        error.value = 'ไม่สามารถจับคู่คนขับได้'
        return null
      }

      currentRide.value = updateData as any

      // Set matched driver
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
        eta: Math.ceil(((driver as any).distance_km || 1) * 2)
      }

      // Subscribe to driver location updates
      subscribeToDriverLocation(provider.id)

      return matchedDriver.value
    } catch (err) {
      const appError = handleError(err)
      error.value = appError.message
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
      const updatePayload = { status: 'cancelled' }
      const { error: cancelError } = await (supabase as any)
        .from('ride_requests')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single()
      
      if (cancelError) {
        error.value = 'ไม่สามารถยกเลิกการเรียกรถได้'
        return false
      }
      
      // Cleanup
      unsubscribeAll()
      currentRide.value = null
      matchedDriver.value = null
      
      return true
    } catch (err) {
      const appError = handleError(err)
      error.value = appError.message
      return false
    } finally {
      loading.value = false
    }
  }

  // Complete ride
  const completeRide = async () => {
    if (!currentRide.value) return false
    
    loading.value = true
    error.value = null
    
    try {
      const updatePayload = { status: 'completed' }
      const { error: completeError } = await (supabase as any)
        .from('ride_requests')
        .update(updatePayload)
        .eq('id', currentRide.value!.id)
        .select()
        .single()
      
      if (completeError) {
        error.value = 'ไม่สามารถอัปเดตสถานะการเดินทางได้'
        return false
      }
      
      // Cleanup
      unsubscribeAll()
      currentRide.value = null
      matchedDriver.value = null
      
      return true
    } catch (err) {
      const appError = handleError(err)
      error.value = appError.message
      return false
    } finally {
      loading.value = false
    }
  }

  // Submit rating
  const submitRating = async (rating: number, tipAmount: number = 0, comment?: string) => {
    if (!currentRide.value || !matchedDriver.value) return false
    
    loading.value = true
    error.value = null
    
    try {
      // Insert rating
      const { error: ratingError } = await supabase
        .from('ride_ratings')
        .insert({
          ride_id: currentRide.value!.id,
          user_id: currentRide.value!.user_id,
          provider_id: matchedDriver.value!.id,
          rating,
          tip_amount: tipAmount,
          comment
        } as any)
        .select()
        .single()

      if (ratingError) {
        logger.warn('Rating error:', ratingError)
        // Continue anyway - rating is not critical
      }

      // Update provider rating average
      const { data: ratingsData, error: ratingsError } = await supabase
        .from('ride_ratings')
        .select('rating')
        .eq('provider_id', matchedDriver.value!.id)

      if (!ratingsError && ratingsData) {
        const ratings = ratingsData as Array<{ rating: number }>
        if (ratings.length > 0) {
          const avgRating = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
          
          const providerUpdatePayload = {
            rating: Math.round(avgRating * 100) / 100,
            total_trips: ratings.length
          }
          await (supabase as any)
            .from('service_providers')
            .update(providerUpdatePayload)
            .eq('id', matchedDriver.value!.id)
            .select()
            .single()
        }
      }

      // Complete the ride
      await completeRide()
      
      return true
    } catch (err) {
      const appError = handleError(err)
      error.value = appError.message
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
      const result = await dedupRequest(
        RequestKeys.rideHistory(userId),
        async () => {
          const { data, error: fetchError } = await supabase
            .from('ride_requests')
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
            throw fromSupabaseError(fetchError)
          }
          
          return data || []
        },
        { ttl: 60000 } // Cache for 1 minute
      )
      
      rideHistory.value = result
      return result
    } catch (err) {
      const appError = handleError(err, { logToSentry: false })
      error.value = appError.message
      rideHistory.value = []
      return []
    } finally {
      loading.value = false
    }
  }

  // Subscribe to ride updates
  const subscribeToRideUpdates = (rideId: string) => {
    // Validate rideId before subscribing
    if (!rideId || rideId === 'undefined' || rideId === 'null') {
      logger.warn('[subscribeToRideUpdates] Invalid rideId:', rideId)
      return null
    }

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
    // Validate providerId before subscribing
    if (!providerId || providerId === 'undefined' || providerId === 'null') {
      logger.warn('[subscribeToDriverLocation] Invalid providerId:', providerId)
      return null
    }

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
    pendingDestination.value = null
  }

  // Pending destination (for pre-setting from services page)
  const pendingDestination = ref<Location | null>(null)

  // Set destination before navigating to ride page
  const setDestination = (destination: Location) => {
    pendingDestination.value = destination
  }

  // Get and clear pending destination
  const consumeDestination = (): Location | null => {
    const dest = pendingDestination.value
    pendingDestination.value = null
    return dest
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
    reset,
    pendingDestination,
    setDestination,
    consumeDestination
  }
})
