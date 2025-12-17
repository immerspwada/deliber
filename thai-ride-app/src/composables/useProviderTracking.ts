/**
 * Feature: F31 - Real GPS Tracking for Provider
 * Tables: service_providers (current_lat, current_lng)
 * 
 * ระบบติดตามตำแหน่ง Provider แบบ realtime
 * - อัพเดทตำแหน่งทุก 5 วินาทีเมื่อออนไลน์
 * - อัพเดททุก 3 วินาทีเมื่อมีงาน active
 * - ประหยัดแบตเตอรี่ด้วย adaptive tracking
 * - รองรับ background tracking (PWA)
 */

import { ref, onUnmounted, computed } from 'vue'
import { supabase } from '../lib/supabase'
import { captureError, addBreadcrumb } from '../lib/sentry'
import { useGeofencing } from './useGeofencing'

export interface TrackingConfig {
  // Update intervals (ms)
  idleInterval: number      // When online but no active ride
  activeInterval: number    // When has active ride
  
  // GPS options
  enableHighAccuracy: boolean
  timeout: number
  maximumAge: number
  
  // Minimum distance to trigger update (meters)
  minDistance: number
}

const DEFAULT_CONFIG: TrackingConfig = {
  idleInterval: 10000,      // 10 seconds when idle
  activeInterval: 3000,     // 3 seconds when active
  enableHighAccuracy: true,
  timeout: 15000,
  maximumAge: 5000,
  minDistance: 10,          // 10 meters minimum movement
}

export function useProviderTracking(providerId: string | null) {
  const isTracking = ref(false)
  const currentPosition = ref<{ lat: number; lng: number; accuracy: number } | null>(null)
  const lastUpdateTime = ref<Date | null>(null)
  const trackingError = ref<string | null>(null)
  const hasActiveRide = ref(false)
  const updateCount = ref(0)
  const batteryLevel = ref<number | null>(null)
  
  // Geofencing for service area check
  const { checkLocation, isInsideServiceArea, distanceFromCenter, SERVICE_AREA } = useGeofencing()
  
  let watchId: number | null = null
  let updateInterval: ReturnType<typeof setInterval> | null = null
  let lastSentPosition: { lat: number; lng: number } | null = null
  
  const config = ref<TrackingConfig>({ ...DEFAULT_CONFIG })

  // Calculate distance between two points (Haversine)
  const calculateDistance = (
    lat1: number, lng1: number,
    lat2: number, lng2: number
  ): number => {
    const R = 6371000 // Earth's radius in meters
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

  // Check battery level for adaptive tracking
  const checkBattery = async () => {
    try {
      if ('getBattery' in navigator) {
        const battery = await (navigator as any).getBattery()
        batteryLevel.value = Math.round(battery.level * 100)
        
        // Reduce tracking frequency if battery is low
        if (battery.level < 0.2 && !battery.charging) {
          config.value.idleInterval = 30000  // 30 seconds
          config.value.activeInterval = 5000 // 5 seconds
        }
      }
    } catch {
      // Battery API not available
    }
  }

  // Update position to database
  const updatePositionToDb = async (lat: number, lng: number, accuracy: number) => {
    if (!providerId) return false

    // Check minimum distance
    if (lastSentPosition) {
      const distance = calculateDistance(
        lastSentPosition.lat, lastSentPosition.lng,
        lat, lng
      )
      if (distance < config.value.minDistance) {
        return false // Skip update if not moved enough
      }
    }

    try {
      const { error } = await (supabase
        .from('service_providers') as any)
        .update({
          current_lat: lat,
          current_lng: lng,
          last_location_update: new Date().toISOString()
        })
        .eq('id', providerId)

      if (error) throw error

      lastSentPosition = { lat, lng }
      lastUpdateTime.value = new Date()
      updateCount.value++
      
      addBreadcrumb('Location updated', 'tracking', { lat, lng, accuracy })
      
      return true
    } catch (err: any) {
      trackingError.value = err.message
      captureError(err, { providerId, lat, lng }, 'warning')
      return false
    }
  }

  // Handle position update from GPS
  const handlePositionUpdate = (position: GeolocationPosition) => {
    const { latitude, longitude, accuracy } = position.coords
    
    currentPosition.value = {
      lat: latitude,
      lng: longitude,
      accuracy
    }
    
    trackingError.value = null
    
    // Check geofencing - alert if outside service area
    checkLocation(latitude, longitude)
    
    // Update to database
    updatePositionToDb(latitude, longitude, accuracy)
  }

  // Handle GPS error
  const handlePositionError = (error: GeolocationPositionError) => {
    let message = 'ไม่สามารถระบุตำแหน่งได้'
    
    switch (error.code) {
      case error.PERMISSION_DENIED:
        message = 'กรุณาอนุญาตการเข้าถึงตำแหน่ง'
        break
      case error.POSITION_UNAVAILABLE:
        message = 'ไม่สามารถระบุตำแหน่งได้ กรุณาตรวจสอบ GPS'
        break
      case error.TIMEOUT:
        message = 'หมดเวลาในการระบุตำแหน่ง'
        break
    }
    
    trackingError.value = message
    captureError(new Error(message), { code: error.code }, 'warning')
  }

  // Start tracking
  const startTracking = async () => {
    if (!providerId) {
      trackingError.value = 'ไม่พบ Provider ID'
      return false
    }

    if (!navigator.geolocation) {
      trackingError.value = 'เบราว์เซอร์ไม่รองรับ GPS'
      return false
    }

    // Check battery
    await checkBattery()

    // Start watching position
    watchId = navigator.geolocation.watchPosition(
      handlePositionUpdate,
      handlePositionError,
      {
        enableHighAccuracy: config.value.enableHighAccuracy,
        timeout: config.value.timeout,
        maximumAge: config.value.maximumAge
      }
    )

    isTracking.value = true
    addBreadcrumb('Tracking started', 'tracking', { providerId })
    
    return true
  }

  // Stop tracking
  const stopTracking = () => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId)
      watchId = null
    }

    if (updateInterval) {
      clearInterval(updateInterval)
      updateInterval = null
    }

    isTracking.value = false
    addBreadcrumb('Tracking stopped', 'tracking', { providerId })
  }

  // Set active ride status (changes tracking frequency)
  const setActiveRide = (active: boolean) => {
    hasActiveRide.value = active
    
    // Restart tracking with new interval if needed
    if (isTracking.value) {
      stopTracking()
      startTracking()
    }
  }

  // Get current interval based on state
  const currentInterval = computed(() => {
    return hasActiveRide.value 
      ? config.value.activeInterval 
      : config.value.idleInterval
  })

  // Force update position now
  const forceUpdate = () => {
    if (!navigator.geolocation) return

    navigator.geolocation.getCurrentPosition(
      handlePositionUpdate,
      handlePositionError,
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    )
  }

  // Cleanup on unmount
  onUnmounted(() => {
    stopTracking()
  })

  return {
    isTracking,
    currentPosition,
    lastUpdateTime,
    trackingError,
    hasActiveRide,
    updateCount,
    batteryLevel,
    currentInterval,
    isInsideServiceArea,
    distanceFromCenter,
    SERVICE_AREA,
    startTracking,
    stopTracking,
    setActiveRide,
    forceUpdate,
    config
  }
}

// Singleton for background tracking
let globalTrackingInstance: ReturnType<typeof useProviderTracking> | null = null

export const getGlobalTracking = (providerId: string) => {
  if (!globalTrackingInstance) {
    globalTrackingInstance = useProviderTracking(providerId)
  }
  return globalTrackingInstance
}

export const clearGlobalTracking = () => {
  if (globalTrackingInstance) {
    globalTrackingInstance.stopTracking()
    globalTrackingInstance = null
  }
}
