/**
 * Feature: F33 - Realtime Driver Location Tracking for Customer
 * Tables: service_providers (current_lat, current_lng)
 * 
 * ระบบติดตามตำแหน่งคนขับแบบ realtime สำหรับลูกค้า
 * - แสดงตำแหน่งคนขับบนแผนที่
 * - อัพเดท ETA แบบ realtime
 * - แสดง animation การเคลื่อนที่
 */

import { ref, onUnmounted } from 'vue'
import { supabase } from '../lib/supabase'

export interface DriverLocation {
  lat: number
  lng: number
  heading?: number
  speed?: number
  lastUpdate: Date
}

export function useDriverTracking(providerId: string | null) {
  const driverLocation = ref<DriverLocation | null>(null)
  const isTracking = ref(false)
  const trackingError = ref<string | null>(null)
  const updateCount = ref(0)
  
  let subscription: any = null

  // Calculate distance between two points (Haversine)
  const calculateDistance = (
    lat1: number, lng1: number,
    lat2: number, lng2: number
  ): number => {
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

  // Calculate ETA based on distance (simple estimation)
  const calculateETA = (distanceKm: number): number => {
    // Assume average speed of 25 km/h in city traffic
    const avgSpeedKmH = 25
    return Math.ceil((distanceKm / avgSpeedKmH) * 60) // minutes
  }

  // Get ETA to a destination
  const getETATo = (destLat: number, destLng: number): number => {
    if (!driverLocation.value) return 0
    const distance = calculateDistance(
      driverLocation.value.lat,
      driverLocation.value.lng,
      destLat,
      destLng
    )
    return calculateETA(distance)
  }

  // Get distance to a destination
  const getDistanceTo = (destLat: number, destLng: number): number => {
    if (!driverLocation.value) return 0
    return calculateDistance(
      driverLocation.value.lat,
      driverLocation.value.lng,
      destLat,
      destLng
    )
  }

  // Start tracking driver location
  const startTracking = async () => {
    if (!providerId) {
      trackingError.value = 'ไม่พบ Provider ID'
      return false
    }

    // Fetch initial location
    try {
      const { data, error } = await supabase
        .from('service_providers')
        .select('current_lat, current_lng, last_location_update')
        .eq('id', providerId)
        .single()

      if (error) throw error

      const providerData = data as { current_lat: number | null; current_lng: number | null; last_location_update: string | null } | null
      if (providerData?.current_lat && providerData?.current_lng) {
        driverLocation.value = {
          lat: providerData.current_lat,
          lng: providerData.current_lng,
          lastUpdate: new Date(providerData.last_location_update || Date.now())
        }
      }
    } catch (err: any) {
      console.warn('Error fetching initial driver location:', err)
    }

    // Subscribe to realtime updates
    subscription = supabase
      .channel(`driver-tracking:${providerId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'service_providers',
          filter: `id=eq.${providerId}`
        },
        (payload) => {
          const newData = payload.new as any
          if (newData.current_lat && newData.current_lng) {
            // Calculate heading if we have previous location
            let heading: number | undefined
            if (driverLocation.value) {
              const dLat = newData.current_lat - driverLocation.value.lat
              const dLng = newData.current_lng - driverLocation.value.lng
              heading = Math.atan2(dLng, dLat) * (180 / Math.PI)
            }

            driverLocation.value = {
              lat: newData.current_lat,
              lng: newData.current_lng,
              heading,
              lastUpdate: new Date()
            }
            updateCount.value++
          }
        }
      )
      .subscribe()

    isTracking.value = true
    return true
  }

  // Stop tracking
  const stopTracking = () => {
    if (subscription) {
      subscription.unsubscribe()
      subscription = null
    }
    isTracking.value = false
  }

  // Cleanup on unmount
  onUnmounted(() => {
    stopTracking()
  })

  return {
    driverLocation,
    isTracking,
    trackingError,
    updateCount,
    startTracking,
    stopTracking,
    getETATo,
    getDistanceTo,
    calculateDistance
  }
}
